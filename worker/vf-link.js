/* Backend /api/vf-link para VikingFile (Cloudflare Worker).

   Recibe { hash, token } desde el frontend, hace el POST server-to-server a
   https://vikingfile.com/f/<HASH> con el token de Turnstile y devuelve el JSON
   { link, files?, linkArchive? } de VikingFile. */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const RE_HASH = /^[A-Za-z0-9]+$/;
const RUTAS = ['/', '/api/vf-link'];

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if(request.method === 'OPTIONS'){
            return new Response(null, { status: 204, headers: cors(request, env) });
        }

        if(!RUTAS.includes(url.pathname)){
            return json({ error: 'Not found' }, 404, request, env);
        }

        if(request.method !== 'POST'){
            return json({ error: 'Method not allowed' }, 405, request, env);
        }

        let cuerpo;

        try{
            cuerpo = await request.json();
        }catch(error){
            return json({ error: 'JSON no válido' }, 400, request, env);
        }

        const hash = String(cuerpo.hash || '').trim();
        const token = String(cuerpo.token || '').trim();

        if(!RE_HASH.test(hash) || !token){
            return json({ error: 'Faltan parámetros' }, 400, request, env);
        }

        // vikingfile.com responde 302 hacia vik1ngfile.site. Se usa el host
        // canónico directamente: si se dejara que fetch siguiera el 302, el
        // POST se convertiría en GET y el token dejaría de enviarse.
        const objetivo = `https://vik1ngfile.site/f/${hash}`;
        const control = new AbortController();
        const temporizador = setTimeout(() => control.abort(), 30000);

        try{
            const respuesta = await fetch(objetivo, {
                method: 'POST',
                signal: control.signal,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': UA,
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
                    'Referer': objetivo,
                    'Origin': 'https://vik1ngfile.site'
                },
                body: 'cf-turnstile-response=' + encodeURIComponent(token)
            });

            const texto = await respuesta.text();
            let datos;

            try{
                datos = JSON.parse(texto);
            }catch(error){
                return json({ error: 'Respuesta no JSON', raw: texto.slice(0, 300) }, 502, request, env);
            }

            if(!datos.link){
                return json({ error: datos.error || 'Sin enlace', raw: datos }, 502, request, env);
            }

            return json(datos, 200, request, env);

        }catch(error){
            const mensaje = error.name === 'AbortError'
                ? 'Tiempo de espera agotado'
                : String(error);

            return json({ error: mensaje }, 502, request, env);

        }finally{
            clearTimeout(temporizador);
        }
    }
};

function origenPermitido(request, env) {
    const lista = String((env && env.ALLOWED_ORIGINS) || '')
        .split(',')
        .map(origen => origen.trim())
        .filter(Boolean);

    if(lista.length === 0) return '*';

    const origen = request.headers.get('Origin') || '';
    return lista.includes(origen) ? origen : lista[0];
}

function cors(request, env) {
    return {
        'Access-Control-Allow-Origin': origenPermitido(request, env),
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin'
    };
}

function json(datos, estado, request, env) {
    return new Response(JSON.stringify(datos), {
        status: estado,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            ...cors(request, env)
        }
    });
}
