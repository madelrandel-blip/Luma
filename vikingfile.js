/* VikingFile auto-download — mismo UX que MediaFire.

   Expone:
     VikingFile.isVikingFile(url)                  -> true si el enlace es de VikingFile
     VikingFile.hashFrom(url)                      -> hash de /f/<HASH>
     VikingFile.handle(url, boton, onStatus, opts) -> inicia el flujo (devuelve Promise)
     VikingFile.reset()                            -> cancela y destruye el widget
     VikingFile.dominioBloqueado()                 -> true si Turnstile ya rechazó el dominio

   El flujo es: Turnstile (sitekey pública de VikingFile) -> POST al backend
   propio (/api/vf-link) -> <a> programático con la URL directa, para que el
   navegador muestre su ventana/barra de descarga nativa. */
(function (global) {
    'use strict';

    const SITEKEY = '0x4AAAAAAAgbsMNBuk2d3Qp6'; // sitekey pública de VikingFile
    const BACKEND = '/api/vf-link';             // endpoint por defecto (Worker, Vercel, PHP...)
    const RE_VF   = /^https?:\/\/(?:www\.)?vik(?:i|1)ngfile\.(?:com|site)\/f\/([A-Za-z0-9]+)/i;
    const ESPERA_MAXIMA = 120000;               // 2 min para resolver el captcha

    let tsPromise = null;
    let widgetId = null;
    let widgetContainer = null;
    let pending = null;
    let ctx = null;
    let ejecucion = 0;

    const CLAVE_BLOQUEO = 'vf-dominio-bloqueado';

    const isVikingFile = (url) => RE_VF.test(String(url || ''));
    const hashFrom = (url) => (String(url).match(RE_VF) || [])[1];

    function vfError(mensaje, codigo) {
        const error = new Error(mensaje);
        error.code = codigo;
        return error;
    }

    function backendPorDefecto() {
        if(global.VF_BACKEND) return String(global.VF_BACKEND);

        const meta = document.querySelector('meta[name="vf-backend"]');
        if(meta && meta.content.trim()) return meta.content.trim();

        return BACKEND;
    }

    /* Turnstile rechaza la sitekey de VikingFile fuera de su dominio (110200).
       Se recuerda durante la sesión para no repetir un intento que ya sabemos
       que va a fallar: el siguiente clic abre la página incrustada al instante.
       No se usa localStorage porque, si VikingFile autoriza el dominio, basta
       con abrir una pestaña nueva para volver a intentarlo. */
    function dominioBloqueado() {
        try{
            return global.sessionStorage.getItem(CLAVE_BLOQUEO) === '1';
        }catch(error){
            return false; // almacenamiento no disponible (modo privado)
        }
    }

    function bloquearDominio() {
        try{
            global.sessionStorage.setItem(CLAVE_BLOQUEO, '1');
        }catch(error){
            /* sin almacenamiento: se reintenta en cada clic */
        }
    }

    function loadTurnstile() {
        if(global.turnstile) return Promise.resolve();
        if(tsPromise) return tsPromise;

        tsPromise = new Promise((resolve, reject) => {
            global.__vfTsLoad = () => resolve();

            const s = document.createElement('script');
            s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__vfTsLoad';
            s.async = true;
            s.defer = true;
            s.onerror = () => {
                tsPromise = null;
                reject(vfError('No se pudo cargar el captcha', 'VF_CAPTCHA'));
            };
            document.head.appendChild(s);
        });

        return tsPromise;
    }

    /* El estado va a onStatus (el modal, igual que MediaFire). Solo se escribe
       en el botón si se pide explícitamente con opts.buttonText === true, para
       no borrar iconos o etiquetas del botón original. */
    function setStatus(mensaje) {
        if(!ctx) return;

        if(typeof ctx.onStatus === 'function') ctx.onStatus(mensaje);

        if(ctx.btn){
            ctx.btn.setAttribute('aria-label', mensaje);
            if(ctx.buttonText) ctx.btn.textContent = mensaje;
        }
    }

    /* Descarga con el flujo nativo del navegador (aparece la ventana/barra de descarga) */
    function startDownload(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        if(filename) a.download = filename;
        a.rel = 'noopener';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    async function requestLink(backend, hash, token) {
        let respuesta;

        try{
            respuesta = await fetch(backend, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hash, token })
            });
        }catch(error){
            throw vfError('No se pudo contactar con el servidor', 'VF_BACKEND');
        }

        const datos = await respuesta.json().catch(() => ({}));

        if(!respuesta.ok || !datos.link){
            const detalle = String(datos.error || ('HTTP ' + respuesta.status));
            let codigo = 'VF_SERVER';

            if(/110200|invalid domain/i.test(detalle)) codigo = 'VF_DOMAIN';
            else if(respuesta.status === 404) codigo = 'VF_BACKEND';

            throw vfError(detalle, codigo);
        }

        return datos;
    }

    function quitarWidget() {
        if(widgetId !== null && global.turnstile){
            try{ global.turnstile.remove(widgetId); }catch(error){ /* ya no existe */ }
        }

        widgetId = null;
        widgetContainer = null;
    }

    function resolverToken(token) {
        const p = pending;
        pending = null;
        if(p) p.resolve(token);
    }

    function falloCaptcha(codigo) {
        const p = pending;
        pending = null;

        const bloqueado = /110200/.test(String(codigo == null ? '' : codigo));

        if(bloqueado) bloquearDominio();

        const error = bloqueado
            ? vfError('El captcha de VikingFile no admite este dominio (110200)', 'VF_DOMAIN')
            : vfError('Error de verificación, reintenta', 'VF_CAPTCHA');

        if(p){
            p.reject(error);
            return;
        }

        if(ctx && ctx.busy && ctx.fase === 'captcha'){
            ctx.busy = false;
            setStatus(error.message);
            if(typeof ctx.onError === 'function') ctx.onError(error);
        }
    }

    function expiroCaptcha() {
        const p = pending;
        pending = null;

        const error = vfError('Verificación expirada, reintenta', 'VF_EXPIRED');

        if(p){
            p.reject(error);
            return;
        }

        if(ctx && ctx.busy && ctx.fase === 'captcha'){
            ctx.busy = false;
            setStatus(error.message);
            if(typeof ctx.onError === 'function') ctx.onError(error);
        }
    }

    function crearWidget(container, resolve, reject) {
        pending = { resolve, reject };
        widgetContainer = container;

        try{
            widgetId = global.turnstile.render(container, {
                sitekey: SITEKEY,
                size: 'flexible',
                callback: resolverToken,
                'error-callback': falloCaptcha,
                'expired-callback': expiroCaptcha
            });
        }catch(error){
            pending = null;
            widgetContainer = null;
            reject(vfError('No se pudo mostrar el captcha', 'VF_CAPTCHA'));
        }
    }

    function ensureWidget(container) {
        return loadTurnstile().then(() => new Promise((resolve, reject) => {
            // Mismo contenedor: se reutiliza el widget y se pide un token nuevo
            if(widgetId !== null && widgetContainer === container){
                pending = { resolve, reject };

                try{
                    global.turnstile.reset(widgetId); // reintento: nueva verificación
                }catch(error){
                    quitarWidget();
                    crearWidget(container, resolve, reject);
                }
                return;
            }

            if(widgetId !== null) quitarWidget();
            crearWidget(container, resolve, reject);
        }));
    }

    function conLimite(promesa, ms) {
        return new Promise((resolve, reject) => {
            const temporizador = setTimeout(
                () => reject(vfError('La verificación tardó demasiado', 'VF_TIMEOUT')),
                ms
            );

            promesa.then(
                valor => { clearTimeout(temporizador); resolve(valor); },
                error => { clearTimeout(temporizador); reject(error); }
            );
        });
    }

    /* Punto de entrada: se llama desde el clic del botón.
       opts: { container, filename, backend, timeout, buttonText,
               onDone(data), onError(error) } */
    async function handle(url, btn, onStatus, opts = {}) {
        if(!isVikingFile(url)) return false;
        if(ctx && ctx.busy) return true;

        let container = opts.container || (btn && btn.dataset.turnstileContainer);
        if(typeof container === 'string') container = document.querySelector(container);

        // Si no hay contenedor, se crea uno oculto. Si tras 4s no hay token, se muestra.
        let oculto = false;

        if(!container){
            container = document.createElement('div');
            container.style.cssText = 'position:absolute;left:-9999px;top:0;';
            document.body.appendChild(container);
            oculto = true;

            setTimeout(() => {
                if(oculto && ctx && ctx.busy && container.isConnected){
                    container.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:10010;';
                }
            }, 4000);
        }

        const idEjecucion = ++ejecucion;

        ctx = {
            url,
            hash: hashFrom(url),
            filename: opts.filename || (btn && btn.dataset.filename) || '',
            backend: opts.backend || (btn && btn.dataset.backend) || backendPorDefecto(),
            onStatus,
            onDone: opts.onDone,
            onError: opts.onError,
            buttonText: opts.buttonText === true,
            btn,
            container,
            fase: 'captcha',
            busy: true
        };

        try{
            setStatus('Verificando...');

            const token = await conLimite(
                ensureWidget(container),
                opts.timeout || ESPERA_MAXIMA
            );

            if(idEjecucion !== ejecucion) return true;

            setStatus('Generando enlace...');
            ctx.fase = 'enlace';

            const datos = await requestLink(ctx.backend, ctx.hash, token);

            if(idEjecucion !== ejecucion) return true;

            setStatus('Descargando...');
            ctx.fase = 'descarga';
            startDownload(datos.link, ctx.filename);

            oculto = false;
            ctx.busy = false;

            if(typeof ctx.onDone === 'function') ctx.onDone(datos);

            return true;

        }catch(error){
            oculto = false;

            // Petición reemplazada o cancelada desde reset()
            if(idEjecucion !== ejecucion || !ctx) return true;

            ctx.busy = false;

            if(error && error.code === 'VF_CANCEL') return true;

            if(error && error.code === 'VF_DOMAIN') bloquearDominio();

            const mensajes = {
                VF_DOMAIN: 'Verificación no disponible',
                VF_CAPTCHA: 'Error de verificación, reintenta',
                VF_EXPIRED: 'Verificación expirada, reintenta',
                VF_BACKEND: 'No se pudo contactar con el servidor',
                VF_TIMEOUT: 'La verificación tardó demasiado'
            };

            setStatus(mensajes[error && error.code] || ('Error: ' + error.message));

            if(typeof ctx.onError === 'function') ctx.onError(error);

            return true;
        }
    }

    /* Cancela el flujo en curso y destruye el widget. Se llama al cerrar el
       modal para que el siguiente intento se pinte desde cero. */
    function reset() {
        ejecucion++;

        const p = pending;
        pending = null;
        if(p) p.reject(vfError('Operación cancelada', 'VF_CANCEL'));

        quitarWidget();

        if(ctx) ctx.busy = false;
        ctx = null;
    }

    global.VikingFile = {
        isVikingFile,
        handle,
        hashFrom,
        reset,
        dominioBloqueado,
        SITEKEY
    };
})(window);
