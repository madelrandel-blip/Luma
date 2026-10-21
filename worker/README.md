# Backend de VikingFile (`/api/vf-link`)

Worker de Cloudflare que resuelve el enlace directo de un archivo de VikingFile.
El sitio es estático (GitHub Pages), así que este endpoint vive aparte.

## Desplegar

```bash
cd worker
npx wrangler deploy
```

Wrangler imprimirá una URL parecida a:

```
https://luma-vf-link.tu-subdominio.workers.dev
```

El Worker responde tanto en `/` como en `/api/vf-link`, así que la URL final es:

```
https://luma-vf-link.tu-subdominio.workers.dev/api/vf-link
```

## Conectar la web

Pega esa URL en `index.html`, en la etiqueta que ya existe:

```html
<meta name="vf-backend" content="https://luma-vf-link.tu-subdominio.workers.dev/api/vf-link">
```

También puedes definirla antes de cargar `vikingfile.js`:

```html
<script>window.VF_BACKEND = 'https://luma-vf-link.tu-subdominio.workers.dev/api/vf-link';</script>
```

O por botón:

```html
<a class="download-btn" href="https://vikingfile.com/f/0ksY9kcDjP"
   data-backend="https://luma-vf-link.tu-subdominio.workers.dev/api/vf-link">Descargar</a>
```

Si no se configura, el frontend usa `/api/vf-link` (relativo). En GitHub Pages
eso devuelve 404 y el sitio cae automáticamente al modal de captcha incrustado.

## Probar

```bash
curl -X POST https://luma-vf-link.tu-subdominio.workers.dev/api/vf-link \
  -H "Content-Type: application/json" \
  -d "{\"hash\":\"0ksY9kcDjP\",\"token\":\"TOKEN_DE_TURNSTILE\"}"
```

Respuesta esperada:

```json
{ "link": "https://...", "files": [], "linkArchive": null }
```

## CORS

`ALLOWED_ORIGINS` en `wrangler.toml` limita qué webs pueden llamar al endpoint.
Por defecto solo se permite `https://madelrandel-blip.github.io`.

## Nota sobre Turnstile

La sitekey `0x4AAAAAAAgbsMNBuk2d3Qp6` pertenece a VikingFile y normalmente solo
acepta su propio dominio. Si Turnstile devuelve el error `110200` (Invalid
domain), el frontend no puede generar el token desde GitHub Pages y abre el
modal incrustado para completar el captcha en la página real. El endpoint
funciona igual en cuanto exista un token válido.
