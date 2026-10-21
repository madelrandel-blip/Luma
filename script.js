/* =========================
   LUMA SWITCH - script.js
   Interfaz pública: catálogo, reproductor, descargas y carrito.
   La capa de datos y el panel de administración están en firebase.js.
   ========================= */

/* ========= ESTADO ========= */
let admin = false;

let juegosData = [];
let homebrewData = [];
let listaActual = [];
let mostrandoHomebrew = false;
let paginaActual = 1;
let juegosPorPagina = 12;

/* ========= ELEMENTOS ========= */
const loginBox = document.getElementById("loginBox");
const adminPanel = document.getElementById("adminPanel");
const logoutBtn = document.getElementById("logoutBtn");
const panelToggleBtn = document.getElementById("panelToggleBtn");

const buscador = document.getElementById("buscador");
const store = document.getElementById("store");
const pagination = document.getElementById("pagination");

const homebrewToggle = document.getElementById("homebrewToggle");
const homebrewLabel = document.getElementById("homebrewLabel");
const homebrewSwitch = document.getElementById("homebrewSwitch");

const bgMusic = document.getElementById("bgMusic");
const musicBtn = document.getElementById("musicBtn");
const musicIcon = document.getElementById("musicIcon");
const musicPlaylist = document.getElementById("musicPlaylist");
const volumeSlider = document.getElementById("volumeSlider");
const volumeIcon = document.getElementById("volumeIcon");
const loadingSound = document.getElementById("loadingSound");

const ICONO_POR_DEFECTO = "assets/images/Luma icon.webp";

/* ========= UTILIDADES ========= */
function esc(valor){
    const entidades = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

    return String(valor ?? "").replace(/[&<>"']/g, c => entidades[c]);
}

/* ========= BOTONES DE PUBLICACIÓN ========= */
// Color predeterminado de cada tipo; en el panel se puede personalizar por botón.
const TIPOS_BOTON = {
    "Obtener":        "#1565c0",
    "Tutorial":       "#2e7d32",
    "Update":         "#ef6c00",
    "Pack de audios": "#7b1fa2",
    "Github":         "#24292f",
    "Partes":         "#00838f",
    "Todas las partes": "#2e7d32",
    "Otro":           "#455a64"
};

// Tipos de botón que guardan una lista de partes en lugar de un solo enlace
const TIPOS_CON_PARTES = ["Partes", "Todas las partes"];

// Colores sugeridos al elegir el color de un botón
const PALETA_BOTON = [
    "#1565c0", "#2196f3", "#00838f", "#00bcd4", "#2e7d32", "#4caf50", "#8bc34a", "#cddc39",
    "#f9a825", "#ffc107", "#ef6c00", "#ff5722", "#c62828", "#f44336", "#ad1457", "#e91e63",
    "#7b1fa2", "#9c27b0", "#512da8", "#3f51b5", "#455a64", "#607d8b", "#24292f", "#ffffff"
];

// Icono Font Awesome de cada tipo
const ICONOS_BOTON = {
    "Obtener":        "fa-solid fa-download",
    "Tutorial":       "fa-solid fa-book-open",
    "Update":         "fa-solid fa-arrows-rotate",
    "Pack de audios": "fa-solid fa-music",
    "Github":         "fa-brands fa-github",
    "Partes":         "fa-solid fa-layer-group",
    "Todas las partes": "fa-solid fa-cloud-arrow-down",
    "Otro":           "fa-solid fa-link"
};

const iconoBoton = (tipo) => ICONOS_BOTON[tipo] || ICONOS_BOTON.Otro;

const colorValido = (color) => /^#[0-9a-f]{6}$/i.test(color || "");

function etiquetaBoton(boton){
    if(boton.tipo === "Partes") return boton.texto || "Descargar por partes";
    if(boton.tipo === "Todas las partes") return boton.texto || "Descargar todas las partes";
    return boton.tipo === "Otro" ? (boton.texto || "Enlace") : boton.tipo;
}

// Partes válidas de un botón "Partes" (cada una con su propio enlace)
function partesBoton(boton){
    return Array.isArray(boton.partes)
        ? boton.partes.filter(p => p && p.url && p.url.trim())
        : [];
}

// Color de texto legible (claro u oscuro) según la luminosidad del fondo
function colorTextoSobre(fondo){
    const n = parseInt(fondo.slice(1), 16);
    const luminancia = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;

    return luminancia > 0.65 ? "#111111" : "#ffffff";
}

// Lista de botones de una publicación. Las publicaciones antiguas solo
// tienen link1/link2, que se interpretan como "Obtener" y "Tutorial".
function obtenerBotones(j){
    if(Array.isArray(j.botones) && j.botones.length > 0){
        return j.botones.filter(b => b && (TIPOS_CON_PARTES.includes(b.tipo) ? partesBoton(b).length > 0 : b.url && b.url.trim()));
    }

    const botones = [];

    if(j.link1) botones.push({ tipo: "Obtener", url: j.link1 });
    if(j.link2) botones.push({ tipo: "Tutorial", url: j.link2 });

    return botones;
}

// Enlace que usa el carrito: el primer "Obtener" o, si no hay, el primer botón
function enlacePrincipal(j){
    const botones = obtenerBotones(j);
    const principal = botones.find(b => b.tipo === "Obtener") || botones[0];

    return principal ? principal.url : "";
}

/* ========= IMÁGENES ========= */
// Las portadas se sirven a través de wsrv.nl (CDN de imágenes): se redimensionan
// y se convierten a WebP, lo que reduce su peso hasta 8 veces.
const CDN_IMG = "https://wsrv.nl/";
const SITIO = "https://madelrandel-blip.github.io/Luma/";

function imgOptimizada(url, ancho){
    if(!url) return "";

    let origen = url;

    if(!/^https?:/i.test(url)){
        // Las imágenes locales solo son accesibles para el CDN una vez publicado el sitio
        if(location.hostname !== new URL(SITIO).hostname) return url;
        origen = new URL(url, SITIO).href;
    }

    if(/\.(gif|svg)(\?|$)/i.test(origen)) return url;

    return `${CDN_IMG}?url=${encodeURIComponent(origen)}&w=${ancho}&we&output=webp&q=80`;
}

// Atributos de una <img>. Las primeras de la página se cargan con prioridad;
// el resto, de forma diferida. Si el CDN falla se usa la imagen original.
function atributosImg(url, ancho, prioritaria = false){
    return `src="${esc(imgOptimizada(url, ancho))}" data-fallback="${esc(url)}" decoding="async" ` +
        (prioritaria ? 'fetchpriority="high"' : 'loading="lazy"');
}

document.addEventListener("error", (e) => {
    const img = e.target;
    if(!(img instanceof HTMLImageElement)) return;

    if(img.dataset.fallback && img.src !== new URL(img.dataset.fallback, location.href).href){
        img.src = img.dataset.fallback;
    }else if(!img.dataset.sinIcono){
        img.dataset.sinIcono = "1";
        img.src = ICONO_POR_DEFECTO;
    }
}, true);

function abrirModal(id){
    const modal = document.getElementById(id);

    if(modal) modal.style.display = "flex";
}

function cerrarModal(id){
    const modal = document.getElementById(id);

    if(modal) modal.style.display = "none";
}

const TIPOS_TOAST = {
    ok:        { icono: "fa-circle-check",       color: "#10b981" },
    aviso:     { icono: "fa-circle-exclamation", color: "#f59e0b" },
    error:     { icono: "fa-circle-xmark",       color: "#ef4444" },
    eliminado: { icono: "fa-trash",              color: "#ef4444" }
};

function mostrarToast(mensaje, tipo = "ok"){
    const contenedor = document.getElementById("toastContainer");
    if(!contenedor) return;

    const { icono, color } = TIPOS_TOAST[tipo] || TIPOS_TOAST.ok;

    const toast = document.createElement("div");
    toast.className = "toast";

    const i = document.createElement("i");
    i.className = `fa-solid ${icono}`;
    i.style.color = color;

    toast.append(i, " ", mensaje);
    contenedor.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}

/* ========= EFECTOS DE SONIDO ========= */
function crearEfecto(id, volumen){
    const audio = document.getElementById(id);

    if(audio) audio.volume = volumen;

    return () => {
        if(!audio) return;

        audio.pause();
        audio.currentTime = 0;
        audio.play().catch(() => {});
    };
}

const playClick = crearEfecto("clickSound", 0.1);
const playAdminClick = crearEfecto("adminSound", 0.14);
const playDiscordClick = crearEfecto("discordSound", 0.15);
const playDonationClick = crearEfecto("donationSound", 0.15);

// Los navegadores exigen un gesto del usuario antes de reproducir audio;
// el primer clic "desbloquea" el efecto para que los siguientes suenen sin retraso.
document.addEventListener("click", () => {
    const clickSound = document.getElementById("clickSound");
    if(!clickSound) return;

    clickSound.play().then(() => {
        clickSound.pause();
        clickSound.currentTime = 0;
    }).catch(() => {});
}, { once: true });

function playLoadingSound(){
    if(!loadingSound) return;

    loadingSound.volume = 0.8;
    loadingSound.currentTime = 0;
    loadingSound.play().catch(() => {});
}

function stopLoadingSound(){
    if(!loadingSound) return;

    loadingSound.pause();
    loadingSound.currentTime = 0;
}

/* ========= REPRODUCTOR ========= */
let playlist = [];
let trackIndex = 0;
let sonidoMuteado = false;
let musicaPausadaPorTrailer = false;

if(bgMusic){
    bgMusic.volume = 0.05;

    window.addEventListener("load", () => {
        bgMusic.pause();
        bgMusic.currentTime = 0;
        bgMusic.muted = true;

        if(volumeSlider){
            volumeSlider.value = bgMusic.volume * 100;
            actualizarVolumenUI();
        }

        if(musicBtn) musicBtn.textContent = "▶";

        cargarPlaylist();
    });

    bgMusic.addEventListener("ended", () => nextTrack(false));

    if(volumeSlider){
        volumeSlider.addEventListener("input", () => {
            bgMusic.volume = volumeSlider.value / 100;

            if(bgMusic.volume > 0){
                bgMusic.muted = false;
                sonidoMuteado = false;
            }

            actualizarVolumenUI();
        });
    }
}

function actualizarVolumenUI(){
    if(!volumeSlider) return;

    const pct = sonidoMuteado ? 0 : volumeSlider.value;

    volumeSlider.style.background =
        `linear-gradient(90deg, rgba(125, 211, 252, 0.55) ${pct}%, rgba(255, 255, 255, 0.10) ${pct}%)`;

    if(volumeIcon){
        volumeIcon.classList.toggle("muted", sonidoMuteado || Number(volumeSlider.value) === 0);
    }
}

function alternarMute(){
    playClick();

    if(!bgMusic) return;

    sonidoMuteado = !sonidoMuteado;
    bgMusic.muted = sonidoMuteado;

    actualizarVolumenUI();
}

async function cargarPlaylist(){
    try{
        const respuesta = await fetch("data/playlist.json", { cache: "no-store" });

        if(!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);

        const datos = await respuesta.json();

        playlist = Array.isArray(datos) ? datos : [];

        if(playlist.length > 0){
            trackIndex = Math.floor(Math.random() * playlist.length);
            bgMusic.src = playlist[trackIndex].src;
        }

        actualizarIcono();
        construirPlaylist();

    }catch(error){
        console.error("No se pudo cargar la playlist:", error);
    }
}

function construirPlaylist(){
    if(!musicPlaylist) return;

    musicPlaylist.innerHTML = "";

    playlist.forEach((cancion, indice) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "playlist-item";
        item.dataset.indice = indice;

        const img = document.createElement("img");
        img.src = cancion.icono || ICONO_POR_DEFECTO;
        img.alt = cancion.nombre || "Canción";

        const nombre = document.createElement("span");
        nombre.textContent = cancion.nombre || "Sin nombre";

        item.append(img, nombre);

        item.addEventListener("click", () => {
            playClick();
            reproducirTrack(indice);
            cerrarPlaylist();
        });

        musicPlaylist.appendChild(item);
    });

    marcarActiva();
}

function marcarActiva(){
    if(!musicPlaylist) return;

    for(const item of musicPlaylist.children){
        item.classList.toggle("active", Number(item.dataset.indice) === trackIndex);
    }
}

function togglePlaylist(){
    if(!musicPlaylist) return;

    playClick();

    if(musicPlaylist.classList.contains("open")){
        cerrarPlaylist();
        return;
    }

    marcarActiva();
    posicionarPlaylist();
    musicPlaylist.classList.add("open");
}

function cerrarPlaylist(){
    if(musicPlaylist) musicPlaylist.classList.remove("open");
}

function posicionarPlaylist(){
    const reproductor = document.querySelector(".music-control") || musicIcon;
    if(!reproductor || !musicPlaylist) return;

    const rect = reproductor.getBoundingClientRect();
    const anchoMenu = 240;
    const margen = 8;

    const left = Math.max(margen, Math.min(rect.left, window.innerWidth - anchoMenu - margen));
    musicPlaylist.style.left = left + "px";

    const altoMenu = musicPlaylist.offsetHeight || 260;
    const espacioAbajo = window.innerHeight - rect.bottom;
    const esMovil = window.innerWidth <= 1100;

    // Sin espacio debajo (o en móvil, donde el reproductor va en la barra
    // inferior), el menú se ancla por abajo y se despliega hacia arriba.
    if(esMovil || espacioAbajo < altoMenu + 10){
        musicPlaylist.style.top = "auto";
        musicPlaylist.style.bottom = (window.innerHeight - rect.top + 10) + "px";
    }else{
        musicPlaylist.style.top = (rect.bottom + 10) + "px";
        musicPlaylist.style.bottom = "auto";
    }
}

if(musicIcon){
    musicIcon.addEventListener("click", (e) => {
        e.stopPropagation();
        togglePlaylist();
    });
}

if(musicPlaylist){
    musicPlaylist.addEventListener("click", (e) => e.stopPropagation());

    document.addEventListener("click", cerrarPlaylist);
    window.addEventListener("resize", cerrarPlaylist);

    // El scroll dentro de la propia lista no debe cerrarla
    window.addEventListener("scroll", (e) => {
        if(e.target && musicPlaylist.contains(e.target)) return;
        cerrarPlaylist();
    }, true);
}

function marcarReproduciendo(reproduciendo){
    if(musicBtn) musicBtn.textContent = reproduciendo ? "⏸" : "▶";
    if(musicIcon) musicIcon.classList.toggle("playing", reproduciendo);
}

function reproducirMusica(){
    if(!bgMusic || playlist.length === 0) return;

    bgMusic.muted = false;

    bgMusic.play()
        .then(() => marcarReproduciendo(true))
        .catch(error => console.warn("Reproducción bloqueada por el navegador:", error));
}

function pausarMusica(){
    if(!bgMusic) return;

    bgMusic.pause();
    marcarReproduciendo(false);
}

function reproducirTrack(indice){
    if(!bgMusic || playlist.length === 0) return;

    // Navegación circular por la lista
    trackIndex = (indice + playlist.length) % playlist.length;

    bgMusic.src = playlist[trackIndex].src;

    reproducirMusica();
    actualizarIcono();
}

function actualizarIcono(){
    if(playlist.length === 0) return;

    const cancion = playlist[trackIndex];
    const nombre = cancion.nombre || "Luma Switch";

    if(musicIcon){
        musicIcon.src = cancion.icono || ICONO_POR_DEFECTO;
        musicIcon.title = nombre;
    }

    const musicTitle = document.getElementById("musicTitle");

    if(musicTitle){
        const interior = document.getElementById("musicTitleInner") || musicTitle;
        interior.textContent = nombre;
        musicTitle.title = nombre;

        // Si el nombre no cabe, se desplaza con la animación "marquee"
        musicTitle.classList.remove("scrolling");
        void musicTitle.offsetWidth;

        if(musicTitle.scrollWidth > musicTitle.clientWidth){
            musicTitle.style.setProperty("--scroll-dist", (musicTitle.scrollWidth - musicTitle.clientWidth) + "px");
            musicTitle.classList.add("scrolling");
        }
    }

    marcarActiva();
}

function toggleMusic(){
    playClick();

    if(!bgMusic) return;

    if(bgMusic.paused) reproducirMusica();
    else pausarMusica();
}

function nextTrack(conClick = true){
    if(conClick) playClick();

    reproducirTrack(trackIndex + 1);
}

function prevTrack(){
    playClick();

    reproducirTrack(trackIndex - 1);
}

/* ========= BIENVENIDA ========= */
function aceptarBienvenida(){
    const pantalla = document.getElementById("welcomeScreen");

    reproducirMusica();

    if(!pantalla) return;

    pantalla.style.transition = "opacity 0.5s ease";
    pantalla.style.opacity = "0";
    pantalla.style.pointerEvents = "none";

    setTimeout(() => { pantalla.style.display = "none"; }, 500);
}

/* ========= MODALES ========= */
function abrirLogin(){
    playAdminClick();
    abrirModal("loginBox");
}

function cerrarLogin(){
    cerrarModal("loginBox");
}

function abrirEmuladores(){
    playClick();
    abrirModal("emuladoresBox");
    window.cargarEmuladores?.();
}

function cerrarEmuladores(){
    cerrarModal("emuladoresBox");
}

function abrirRecursos(){
    playClick();
    abrirModal("recursosBox");
    window.cargarRecursos?.();
}

function cerrarRecursos(){
    cerrarModal("recursosBox");
}

function abrirDonaciones(){
    playDonationClick();
    abrirModal("donacionesBox");
}

function cerrarDonaciones(){
    cerrarModal("donacionesBox");
}

function abrirDiscord(){
    playDiscordClick();
    window.open("https://discord.gg/pMvkz2RzkJ", "_blank", "noopener");
}

function toggleAdminPanel(){
    if(!adminPanel) return;

    playAdminClick();

    if(adminPanel.classList.contains("open")){
        adminPanel.classList.remove("open");

        // Se espera a que termine la transición de cierre antes de ocultarlo
        setTimeout(() => {
            if(!adminPanel.classList.contains("open")) adminPanel.style.display = "none";
        }, 220);
        return;
    }

    adminPanel.style.display = "block";
    requestAnimationFrame(() => {
        requestAnimationFrame(() => adminPanel.classList.add("open"));
    });
}

/* ========= BÚSQUEDA Y CATÁLOGO ========= */
function aplicarBusqueda(){
    const texto = (buscador ? buscador.value : "").trim().toLowerCase();
    const base = mostrandoHomebrew ? homebrewData : juegosData;

    paginaActual = 1;

    listaActual = texto
        ? base.filter(j =>
            (j.nombre || "").toLowerCase().includes(texto) ||
            (j.desc || "").toLowerCase().includes(texto))
        : base;

    render(listaActual);
}

if(buscador){
    let temporizador = null;

    buscador.addEventListener("input", () => {
        clearTimeout(temporizador);
        temporizador = setTimeout(aplicarBusqueda, 200);
    });
}

if(homebrewToggle){
    homebrewToggle.addEventListener("change", () => {
        mostrandoHomebrew = homebrewToggle.checked;

        if(homebrewSwitch) homebrewSwitch.classList.toggle("active", mostrandoHomebrew);
        if(homebrewLabel) homebrewLabel.textContent = mostrandoHomebrew ? "Homebrew" : "Juegos";

        aplicarBusqueda();
    });
}

/* Tarjetas por página según el ancho de pantalla (columnas × filas) */
function calcularPorPagina(){
    const w = window.innerWidth;

    let columnas;
    if(w <= 768) columnas = 2;
    else if(w <= 900) columnas = 3;
    else if(w <= 1080) columnas = 4;
    else if(w <= 1280) columnas = 5;
    else if(w <= 1600) columnas = 7;
    else if(w <= 1920) columnas = 8;
    else if(w <= 2560) columnas = 10;
    else columnas = 14;

    let filas;
    if(w <= 768) filas = 6;
    else if(w <= 1600) filas = 2;
    else if(w <= 2560) filas = 3;
    else filas = 4;

    return columnas * filas;
}

function tarjetaJuego(j, i){
    const botonVer = obtenerBotones(j).length > 0
        ? `<button class="btn blue" data-accion="preview" data-i="${i}">Ver enlace</button>`
        : "";

    const botonCarrito = enlacePrincipal(j)
        ? `<button class="btn blue cart-add-btn" data-accion="carrito" data-i="${i}"><i class="fa-solid fa-cart-arrow-down"></i> Agregar</button>`
        : "";

    const botonEliminar = admin
        ? `<div class="admin-actions">
                <button data-accion="eliminar" data-i="${i}" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
           </div>`
        : "";

    return `
        <div class="card">
            <img ${atributosImg(j.img, 360, i % juegosPorPagina < 6)} alt="${esc(j.nombre)}">

            <div class="content">
                <div class="info-overlay">
                    <h3>${esc(j.nombre)}</h3>
                    <p>${esc(j.desc)}</p>
                </div>

                <div class="btns">${botonVer}${botonCarrito}</div>
                ${botonEliminar}
            </div>
        </div>`;
}

function render(lista){
    if(!store) return;

    juegosPorPagina = calcularPorPagina();

    const inicio = (paginaActual - 1) * juegosPorPagina;

    store.innerHTML = lista
        .slice(inicio, inicio + juegosPorPagina)
        .map((j, n) => tarjetaJuego(j, inicio + n))
        .join("");

    renderPagination(lista.length);
}

if(store){
    store.addEventListener("click", (e) => {
        const boton = e.target.closest("[data-accion]");
        if(!boton) return;

        const juego = listaActual[Number(boton.dataset.i)];
        if(!juego) return;

        playClick();

        switch(boton.dataset.accion){
            case "preview":
                abrirPreview(juego);
                break;
            case "carrito":
                agregarAlCarrito(juego.nombre, enlacePrincipal(juego), juego.img);
                break;
            case "eliminar":
                confirmarEliminar(juego.id, juego.nombre, mostrandoHomebrew ? "homebrew" : "juegos");
                break;
        }
    });
}

// Botones "Partes" de la vista previa: abren y cierran su lista de enlaces
document.addEventListener("click", (e) => {
    const toggle = e.target.closest(".btn-partes-toggle");
    if(!toggle) return;

    const lista = toggle.nextElementSibling;
    const abrir = lista.hidden;

    playClick();
    lista.hidden = !abrir;
    toggle.setAttribute("aria-expanded", String(abrir));
    toggle.parentElement.classList.toggle("abierto", abrir);
});

// Botones "Todas las partes": descargan la lista completa de enlaces
document.addEventListener("click", (e) => {
    const boton = e.target.closest("[data-partes]");
    if(!boton) return;

    let urls = [];
    try{ urls = JSON.parse(boton.dataset.partes); }catch(error){}

    playClick();
    if(boton.closest("#previewBox")) cerrarPreview();

    descargarTodasLasPartes(urls, boton.dataset.nombre);
});

// Cualquier botón con data-link abre/descarga ese enlace (emuladores,
// recursos, vista previa y lista de descargas del carrito).
document.addEventListener("click", (e) => {
    const boton = e.target.closest("[data-link]");
    if(!boton) return;

    playClick();

    if(boton.closest("#previewBox")) cerrarPreview();

    abrirLink(boton.dataset.link, boton.dataset.nombre);
});

/* ========= PAGINACIÓN ========= */
function renderPagination(totalJuegos){
    if(!pagination) return;

    const totalPaginas = Math.max(1, Math.ceil(totalJuegos / juegosPorPagina));

    let inicio = Math.max(1, paginaActual - 2);
    let fin = Math.min(totalPaginas, paginaActual + 2);

    if(paginaActual <= 3) fin = Math.min(5, totalPaginas);
    if(paginaActual >= totalPaginas - 2) inicio = Math.max(1, totalPaginas - 4);

    const boton = (numero, etiqueta = numero) => `<button onclick="cambiarPagina(${numero})">${etiqueta}</button>`;
    const puntos = `<button disabled>...</button>`;

    let html = `<button ${paginaActual === 1 ? "disabled" : ""} onclick="cambiarPagina(${paginaActual - 1})">⬅</button>`;

    if(inicio > 1){
        html += boton(1);
        if(inicio > 2) html += puntos;
    }

    for(let i = inicio; i <= fin; i++){
        html += `<button class="${i === paginaActual ? "active" : ""}" onclick="cambiarPagina(${i})">${i}</button>`;
    }

    if(fin < totalPaginas){
        if(fin < totalPaginas - 1) html += puntos;
        html += boton(totalPaginas);
    }

    html += `<button ${paginaActual === totalPaginas ? "disabled" : ""} onclick="cambiarPagina(${paginaActual + 1})">➡</button>`;

    pagination.innerHTML = html;
}

function cambiarPagina(numero){
    if(numero === paginaActual) return;

    playClick();

    if(store) store.classList.add("page-transition");

    setTimeout(() => {
        paginaActual = numero;
        render(listaActual);

        window.scrollTo({ top: 0, behavior: "smooth" });

        if(store) store.classList.remove("page-transition");
    }, 250);
}

// Al cambiar la resolución se recalcula la cantidad de tarjetas por página
let temporizadorResize = null;

window.addEventListener("resize", () => {
    clearTimeout(temporizadorResize);

    temporizadorResize = setTimeout(() => {
        const nuevo = calcularPorPagina();
        if(nuevo === juegosPorPagina || listaActual.length === 0) return;

        paginaActual = Math.min(paginaActual, Math.max(1, Math.ceil(listaActual.length / nuevo)));
        render(listaActual);
    }, 150);
});

/* ========= VISTA PREVIA ========= */
function extraerIdYoutube(trailer){
    if(!trailer) return "";

    const enlace = trailer.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if(enlace) return enlace[1];

    return /^[a-zA-Z0-9_-]{11,}$/.test(trailer) ? trailer : "";
}

function abrirPreview(juego){
    const screenshots = Array.isArray(juego.screenshots) ? juego.screenshots : [];

    const botones = obtenerBotones(juego);

    // Un botón con partes necesita la vista previa para elegir cuál descargar
    const tieneDetalle = botones.length > 1 || botones.some(b => TIPOS_CON_PARTES.includes(b.tipo)) || screenshots.length > 0 || juego.trailer || juego.previewDesc ||
        juego.genre || juego.developer || juego.gameId;

    // Sin información adicional no hay nada que mostrar: se abre el enlace directamente
    if(!tieneDetalle){
        abrirLink(enlacePrincipal(juego), juego.nombre);
        return;
    }

    mostrarPreview(juego, screenshots);
}

function mostrarPreview(j, screenshots){
    const box = document.getElementById("previewBox");
    if(!box) return;

    const fila = (etiqueta, valor) => valor ? `<div class="fi"><b>${etiqueta}:</b> ${esc(valor)}</div>` : "";
    const columna = (etiqueta, valor, extra = "") =>
        valor ? `<div class="fi-col"><span class="label">${etiqueta}</span><span class="value${extra}">${esc(valor)}</span></div>` : "";

    document.getElementById("previewImg").src = imgOptimizada(j.img, 600);
    document.getElementById("previewNombre").textContent = j.nombre || "";
    document.getElementById("previewDescModal").textContent = j.previewDesc || "";

    document.getElementById("previewFileInfo").innerHTML =
        fila("ID", j.gameId) +
        fila("Peso", j.size) +
        fila("Idiomas", j.languages) +
        fila("Formato", j.format) +
        fila("Firmware", j.firmware) +
        fila("Actualización", j.update);

    document.getElementById("previewMeta").innerHTML =
        columna("Género", j.genre) +
        columna("Jugadores", j.mode) +
        columna("Desarrolladora", j.developer) +
        columna("Año", j.year) +
        columna("Valoración", j.rating, " gold");

    document.getElementById("previewLinks").innerHTML = obtenerBotones(j).map(b => {
        const fondo = colorValido(b.color) ? b.color : (TIPOS_BOTON[b.tipo] || TIPOS_BOTON.Otro);
        const estilo = `background:${fondo};color:${colorTextoSobre(fondo)}`;

        // Descarga todas las partes seguidas con un solo clic
        if(b.tipo === "Todas las partes"){
            const urls = partesBoton(b).map(p => p.url.trim());
            return `<button class="btn" style="${estilo}" data-partes="${esc(JSON.stringify(urls))}" data-nombre="${esc(j.nombre)}"><i class="${iconoBoton(b.tipo)}"></i> ${esc(etiquetaBoton(b))} (${urls.length})</button>`;
        }

        // Botón desplegable: muestra un enlace por cada parte
        if(b.tipo === "Partes"){
            const partes = partesBoton(b).map((p, i) =>
                `<button class="btn-parte" style="${estilo}" data-link="${esc(p.url)}" data-nombre="${esc(j.nombre)}"><i class="fa-solid fa-download"></i> ${esc(p.texto || `Parte ${i + 1}`)}</button>`
            ).join("");

            return `<div class="btn btn-partes"><button type="button" class="btn-partes-toggle" style="${estilo}" aria-expanded="false"><i class="${iconoBoton(b.tipo)}"></i> ${esc(etiquetaBoton(b))} <i class="fa-solid fa-chevron-down btn-partes-flecha"></i></button><div class="btn-partes-lista" hidden>${partes}</div></div>`;
        }

        return `<button class="btn" style="background:${fondo};color:${colorTextoSobre(fondo)}" data-link="${esc(b.url)}" data-nombre="${esc(j.nombre)}"><i class="${iconoBoton(b.tipo)}"></i> ${esc(etiquetaBoton(b))}</button>`;
    }).join("");

    const idVideo = extraerIdYoutube(j.trailer);

    let miniaturas = screenshots
        .map((src, i) => `<img class="thumb${i === 0 ? " active" : ""}" src="${esc(src.replace("t_720p", "t_screenshot_med"))}" data-src="${esc(src)}" loading="lazy" alt="">`)
        .join("");

    if(idVideo){
        miniaturas += `<div class="thumb thumb-video" data-video="${esc(idVideo)}"><img src="https://img.youtube.com/vi/${esc(idVideo)}/mqdefault.jpg" loading="lazy" alt=""><div class="play-icon"></div></div>`;
    }

    const principal = document.getElementById("previewMain");

    if(screenshots.length > 0) principal.innerHTML = `<img src="${esc(screenshots[0])}" alt="">`;
    else if(idVideo) principal.innerHTML = `<iframe src="https://www.youtube.com/embed/${esc(idVideo)}" allowfullscreen></iframe>`;
    else principal.innerHTML = "";

    document.getElementById("previewThumbs").innerHTML = miniaturas;

    box.style.display = "flex";
}

const previewThumbs = document.getElementById("previewThumbs");

if(previewThumbs){
    previewThumbs.addEventListener("click", (e) => {
        const miniatura = e.target.closest(".thumb");
        if(!miniatura) return;

        if(miniatura.dataset.video) verTrailerEnMain(miniatura.dataset.video, miniatura);
        else if(miniatura.dataset.src) verEnMain(miniatura.dataset.src, miniatura);
    });
}

function seleccionarMiniatura(miniatura){
    document.querySelectorAll(".preview-thumbs .thumb").forEach(t => t.classList.toggle("active", t === miniatura));
}

function verEnMain(src, miniatura){
    const principal = document.getElementById("previewMain");
    if(!principal) return;

    detenerTrailer();

    principal.innerHTML = `<img src="${esc(src)}" alt="">`;
    seleccionarMiniatura(miniatura);
}

function verTrailerEnMain(idVideo, miniatura){
    const principal = document.getElementById("previewMain");
    if(!principal) return;

    // La música se pausa mientras suena el tráiler y se reanuda al cerrarlo
    if(bgMusic && !bgMusic.paused){
        pausarMusica();
        musicaPausadaPorTrailer = true;
    }

    principal.innerHTML = `<iframe src="https://www.youtube.com/embed/${esc(idVideo)}?autoplay=1" allowfullscreen></iframe>`;
    seleccionarMiniatura(miniatura);
}

function detenerTrailer(){
    const principal = document.getElementById("previewMain");
    if(principal) principal.innerHTML = "";

    if(musicaPausadaPorTrailer){
        musicaPausadaPorTrailer = false;
        reproducirMusica();
    }
}

function cerrarPreview(){
    detenerTrailer();
    cerrarModal("previewBox");
}

/* ========= ENLACES Y DESCARGAS ========= */
const RE_ARCHIVO_MEDIAFIRE = /mediafire\.com\/file\/([^/?#]+)/;
const RE_DESCARGA_DIRECTA = /download\d+\.mediafire\.com\//;
const RE_VIKINGFILE = /vik[i1]ngfile\.(?:site|com)\/f\//;

function abrirMiniVentana(link){
    const marco = document.getElementById("captchaFrame");
    const botonPestana = document.getElementById("captchaPestana");
    const cargando = document.getElementById("captchaCargando");

    if(!marco){
        window.open(link, "_blank", "noopener");
        return;
    }

    const destino = /^https?:\/\//.test(link) ? link : "https://" + link;

    // La página de VikingFile tarda varios segundos en pintar; se muestra un
    // aviso hasta que termina de cargar (o al instante si ya estaba cargada).
    if(marco.src === destino){
        if(cargando) cargando.hidden = true;
    }else{
        if(cargando) cargando.hidden = false;

        marco.onload = () => {
            if(cargando) cargando.hidden = true;
        };

        marco.src = destino;
    }

    if(botonPestana){
        botonPestana.onclick = () => {
            window.open(marco.src, "_blank", "noopener");
            cerrarCaptcha();
        };
    }

    abrirModal("captchaBox");
}

function cerrarCaptcha(){
    const marco = document.getElementById("captchaFrame");

    
    if(marco) marco.src = "about:blank";

    cerrarModal("captchaBox");
}

function abrirLink(link, nombre){
    if(!link || !link.trim()){
        mostrarToast("No hay un enlace disponible.", "aviso");
        return;
    }

    if(RE_DESCARGA_DIRECTA.test(link)){
        descargarMediafire(link, nombre, link);
    }else if(RE_ARCHIVO_MEDIAFIRE.test(link)){
        descargarMediafire(link, nombre);
    }else if(RE_VIKINGFILE.test(link)){
        descargarVikingFile(link, nombre);
    }else{
        window.open(link, "_blank", "noopener");
    }
}

const descarga = {
    controller: null,   // cancela la petición en curso
    intervalo: null,    // avance simulado de la barra
    limite: null,       // tiempo máximo del intento automático
    cierre: null,       // cierre diferido del modal tras el éxito
    enlace: null,       // enlace para abrir manualmente si falla
    audioPrevio: null,  // estado del audio antes de silenciarlo
    vikingfile: null,   // descarga de VikingFile en curso
    vikingEspera: null  // temporizador del iframe recortado de VikingFile
};

function silenciarMusicaDuranteDescarga(){
    if(!bgMusic || descarga.audioPrevio) return;

    descarga.audioPrevio = { muted: bgMusic.muted, sonidoMuteado };
    bgMusic.muted = true;
}

function restaurarMusicaDespuesDescarga(){
    if(!bgMusic || !descarga.audioPrevio) return;

    bgMusic.muted = descarga.audioPrevio.muted;
    sonidoMuteado = descarga.audioPrevio.sonidoMuteado;
    descarga.audioPrevio = null;

    actualizarVolumenUI();
}

function detenerProgreso(){
    clearInterval(descarga.intervalo);
    clearTimeout(descarga.limite);
    descarga.intervalo = null;
    descarga.limite = null;

    stopLoadingSound();
    restaurarMusicaDespuesDescarga();
}

/* Detiene y oculta el iframe recortado de VikingFile, dejándolo en blanco para
   que no siga cargando anuncios ni audio en segundo plano. */
function cerrarVikingIncrustado(){
    clearTimeout(descarga.vikingEspera);
    clearTimeout(descarga.vikingRevelar);
    window.removeEventListener("blur", descarga.vikingFoco);
    descarga.vikingEspera = null;

    const caja = document.getElementById("descargaViking");
    const marco = document.getElementById("descargaVikingFrame");

    if(caja){
        caja.hidden = true;
        caja.classList.remove("cargando", "casilla");
    }

    if(marco){
        marco.onload = null;
        if(marco.src !== "about:blank") marco.src = "about:blank";
    }
}

/* Carga la página real de VikingFile dentro del primer modal. El iframe se
   recorta por CSS para mostrar solo la franja del botón "Download": el resto
   de la interfaz (cabecera, anuncios, navegación) queda oculto. El captcha se
   resuelve dentro del propio iframe, así que el botón es el oficial. */
function abrirVikingIncrustado(link){
    const caja = document.getElementById("descargaViking");
    const marco = document.getElementById("descargaVikingFrame");
    const estado = document.getElementById("descargaEstado");
    const barra = document.getElementById("descargaProgress");
    const botonManual = document.getElementById("descargaFallback");

    if(!caja || !marco){
        abrirMiniVentana(link);
        return;
    }

    descarga.enlace = link;
    if(botonManual) botonManual.style.display = "block";

    caja.hidden = false;
    const texto = document.getElementById("descargaVikingTexto");

    caja.classList.remove("casilla");
    caja.classList.add("cargando");
    if(texto) texto.textContent = "Cargando...";

    // Un clic dentro del iframe quita el foco a la ventana: es la única señal
    // de que se pulsó. Cada clic alterna lo que queda bajo el botón: tras
    // pulsar "Download", si no ha descargado, el siguiente clic cae en la
    // casilla para verificarse, y el siguiente vuelve a "Download".
    window.removeEventListener("blur", descarga.vikingFoco);
    descarga.vikingFoco = () => {
        if(document.activeElement !== marco) return;

        clearTimeout(descarga.vikingRevelar);
        descarga.vikingRevelar = setTimeout(() => {
            const aCasilla = !caja.classList.contains("casilla");
            caja.classList.toggle("casilla", aCasilla);
            if(estado){
                estado.textContent = aCasilla
                    ? "¿No empezó la descarga? Pulsa otra vez para verificarte"
                    : "Pulsa Descargar de nuevo";
            }
            if(texto) texto.textContent = aCasilla ? "Verificar" : "Descargar";
            // Se recupera el foco para poder detectar el siguiente clic
            marco.blur();
            window.focus();
        }, 1500);
    };
    window.addEventListener("blur", descarga.vikingFoco);
    if(estado) estado.textContent = "Verificando...";
    if(barra) barra.style.width = "0%";

    playLoadingSound();
    silenciarMusicaDuranteDescarga();

    const destino = /^https?:\/\//.test(link) ? link : "https://" + link;

    if(marco.src !== destino){
        marco.onload = () => {
            if(descarga.vikingfile && estado) estado.textContent = "Generando enlace...";
            // Turnstile tarda un poco más que la página en mostrar la casilla
            clearTimeout(descarga.vikingRevelar);
            descarga.vikingRevelar = setTimeout(() => {
                caja.classList.remove("cargando");
                if(texto) texto.textContent = "Descargar";
                if(estado) estado.textContent = "Pulsa Descargar";
            }, 5500);
        };
        marco.src = destino;
    }

    clearInterval(descarga.intervalo);

    let progreso = 0;
    descarga.intervalo = setInterval(() => {
        progreso = Math.min(90, progreso + Math.random() * 6 + 2);
        if(barra) barra.style.width = progreso + "%";
    }, 180);

    // Cuando el captcha termina, el botón "Download" de VikingFile ya está
    // dentro de la franja. Se deja de simular la barra y se avisa al usuario.
    clearTimeout(descarga.vikingEspera);
    descarga.vikingEspera = setTimeout(() => {
        if(!descarga.vikingfile) return;

        caja.classList.remove("cargando");
        if(!caja.classList.contains("casilla")){
            if(texto) texto.textContent = "Descargar";
            if(estado) estado.textContent = "Pulsa Descargar";
        }
        if(barra) barra.style.width = "100%";
        detenerProgreso();
    }, 9000);
}

function descargarMediafire(link, nombre, directa = null){
    const barra = document.getElementById("descargaProgress");
    const estado = document.getElementById("descargaEstado");
    const botonManual = document.getElementById("descargaFallback");
    const nombreEl = document.getElementById("descargaNombre");

    if(!barra || !estado){
        window.open(link, "_blank", "noopener");
        return;
    }

    // Cancela cualquier descarga anterior antes de iniciar una nueva
    if(descarga.controller) descarga.controller.abort();
    clearTimeout(descarga.cierre);
    detenerProgreso();

    // Se limpia el iframe recortado si venía de VikingFile
    descarga.vikingfile = null;
    descarga.pendientes = null;
    cerrarVikingIncrustado();

    const controller = new AbortController();
    descarga.controller = controller;
    descarga.enlace = null;

    abrirModal("descargaBox");
    barra.style.width = "0%";
    estado.textContent = "Preparando el enlace...";
    if(nombreEl) nombreEl.textContent = nombre || "";
    if(botonManual) botonManual.style.display = "none";

    playLoadingSound();
    silenciarMusicaDuranteDescarga();

    let progreso = 0;
    let agotado = false;

    descarga.intervalo = setInterval(() => {
        progreso = Math.min(90, progreso + Math.random() * 12 + 3);
        barra.style.width = progreso + "%";
    }, 120);

    // Si el intento automático tarda demasiado se cancela y se abre el enlace en pestaña
    descarga.limite = setTimeout(() => {
        agotado = true;
        controller.abort();
        abrirPestanaOFallback(link, "La descarga automática tardó demasiado.");
    }, 20000);

    const exito = () => {
        detenerProgreso();
        descarga.controller = null;
        barra.style.width = "100%";
        estado.textContent = "Descarga iniciada ✔";
        descarga.cierre = setTimeout(cerrarDescarga, 2000);
    };

    const fallo = (mensaje) => {
        detenerProgreso();
        descarga.controller = null;
        barra.style.width = progreso + "%";
        abrirPestanaOFallback(link, mensaje);
    };

    if(directa){
        iniciarDescarga(directa);
        exito();
        return;
    }

    obtenerUrlDirecta(link, controller.signal)
        .then(url => {
            iniciarDescarga(url);
            exito();
        })
        .catch(error => {
            // Ignorar respuestas de intentos ya reemplazados o cancelados
            if(agotado || descarga.controller !== controller) return;

            if(error && error.name === "AbortError"){
                cerrarDescarga();
                return;
            }

            fallo("No se pudo iniciar la descarga automática.");
        });
}

/* Descarga varias partes con un solo clic. Los enlaces de MediaFire se
   resuelven a la vez y las descargas se lanzan en orden (parte 1, 2...) con
   una pequeña pausa; el navegador puede pedir permiso una vez para permitir
   descargas múltiples. Los enlaces de otros hosts no se pueden descargar
   automáticamente y se ofrecen para abrir en pestaña. */
async function descargarTodasLasPartes(urls, nombre){
    const barra = document.getElementById("descargaProgress");
    const estado = document.getElementById("descargaEstado");
    const botonManual = document.getElementById("descargaFallback");
    const nombreEl = document.getElementById("descargaNombre");

    urls = (urls || []).filter(Boolean);
    if(urls.length === 0){
        mostrarToast("No hay partes para descargar.", "aviso");
        return;
    }

    if(!barra || !estado){
        urls.forEach(url => window.open(url, "_blank", "noopener"));
        return;
    }

    // Cancela cualquier descarga anterior antes de iniciar una nueva
    if(descarga.controller) descarga.controller.abort();
    clearTimeout(descarga.cierre);
    detenerProgreso();
    descarga.vikingfile = null;
    descarga.pendientes = null;
    cerrarVikingIncrustado();

    const controller = new AbortController();
    descarga.controller = controller;
    descarga.enlace = null;

    abrirModal("descargaBox");
    barra.style.width = "0%";
    estado.textContent = `Preparando ${urls.length} partes...`;
    if(nombreEl) nombreEl.textContent = nombre || "";
    if(botonManual) botonManual.style.display = "none";

    playLoadingSound();
    silenciarMusicaDuranteDescarga();

    // Se piden todos los enlaces directos a la vez para no esperar parte a parte
    const directas = urls.map(url => {
        if(RE_DESCARGA_DIRECTA.test(url)) return Promise.resolve(url);
        if(RE_ARCHIVO_MEDIAFIRE.test(url)) return obtenerUrlDirecta(url, controller.signal);
        return Promise.reject(new Error("Host sin descarga automática"));
    });
    directas.forEach(p => p.catch(() => {}));

    const fallidas = [];
    const pausa = (ms) => new Promise(resolver => setTimeout(resolver, ms));

    for(let i = 0; i < urls.length; i++){
        if(controller.signal.aborted) return;

        estado.textContent = `Preparando parte ${i + 1} de ${urls.length}...`;

        try{
            const directa = await directas[i];
            if(controller.signal.aborted) return;

            iniciarDescarga(directa);
            estado.textContent = `Parte ${i + 1} de ${urls.length} iniciada ✔`;

        }catch(error){
            if(controller.signal.aborted) return;
            fallidas.push(i);
        }

        barra.style.width = ((i + 1) / urls.length * 100) + "%";

        // Pausa entre descargas para que el navegador no descarte ninguna
        if(i < urls.length - 1) await pausa(1200);
    }

    detenerProgreso();
    descarga.controller = null;

    if(fallidas.length === 0){
        estado.textContent = `${urls.length} partes iniciadas ✔`;
        descarga.cierre = setTimeout(cerrarDescarga, 2500);
        return;
    }

    // Las partes que no se pudieron descargar se abren a mano, una por clic
    const pendientes = fallidas.map(i => urls[i]);
    const numeros = fallidas.map(i => i + 1).join(", ");

    estado.textContent = `No se pudo descargar automáticamente: parte ${numeros}. Pulsa el botón para abrirla.`;
    descarga.enlace = pendientes[0];
    descarga.pendientes = pendientes.slice(1);
    if(botonManual) botonManual.style.display = "block";
}

/* VikingFile: mismo patrón que MediaFire (modal de descarga + estados), con
   la página real cargada en el iframe recortado del propio modal. */
function descargarVikingFile(link, nombre){
    const barra = document.getElementById("descargaProgress");
    const estado = document.getElementById("descargaEstado");
    const botonManual = document.getElementById("descargaFallback");
    const nombreEl = document.getElementById("descargaNombre");

    if(!barra || !estado){
        if(descarga.controller) descarga.controller.abort();
        descarga.controller = null;
        detenerProgreso();
        abrirMiniVentana(link);
        return;
    }

    // Cancela cualquier descarga anterior antes de iniciar una nueva
    if(descarga.controller) descarga.controller.abort();
    descarga.controller = null;
    clearTimeout(descarga.cierre);
    detenerProgreso();
    cerrarVikingIncrustado();

    descarga.enlace = null;
    descarga.vikingfile = { link, nombre };
    descarga.pendientes = null;

    abrirModal("descargaBox");
    barra.style.width = "0%";
    estado.textContent = "Verificando...";
    if(nombreEl) nombreEl.textContent = nombre || "";
    if(botonManual) botonManual.style.display = "none";

    abrirVikingIncrustado(link);
}

function abrirPestanaOFallback(link, mensaje){
    detenerProgreso();

    // Intenta abrir la pestaña; si el navegador la bloquea (no hay gesto del
    // usuario), se muestra un botón para abrirla manualmente. No se usa
    // "noopener" porque haría que open() devuelva siempre null.
    const ventana = window.open(link, "_blank");

    if(ventana){
        if(descarga.controller) descarga.controller.abort();
        descarga.controller = null;
        cerrarModal("descargaBox");
        return;
    }

    descarga.enlace = link;

    const estado = document.getElementById("descargaEstado");
    const boton = document.getElementById("descargaFallback");

    if(estado) estado.textContent = `${mensaje} Pulsa el botón para abrir el enlace en una pestaña nueva.`;
    if(boton) boton.style.display = "block";
}

function abrirEnlaceFallback(){
    if(!descarga.enlace) return;

    window.open(descarga.enlace, "_blank", "noopener");

    // Si quedan más partes por abrir (descarga de todas las partes), se
    // ofrece la siguiente en lugar de cerrar el modal.
    if(descarga.pendientes && descarga.pendientes.length){
        descarga.enlace = descarga.pendientes.shift();
        return;
    }

    cerrarDescarga();
}

function cerrarDescarga(){
    if(descarga.controller) descarga.controller.abort();
    descarga.controller = null;
    descarga.pendientes = null;
    descarga.enlace = null;
    descarga.vikingfile = null;

    cerrarVikingIncrustado();

    clearTimeout(descarga.cierre);
    detenerProgreso();

    cerrarModal("descargaBox");

    const nombreEl = document.getElementById("descargaNombre");
    if(nombreEl) nombreEl.textContent = "";
}

function iniciarDescarga(url){
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    a.rel = "noopener";
    a.style.display = "none";

    document.body.appendChild(a);
    a.click();
    a.remove();
}

function errorAbortado(){
    const error = new Error("Operación cancelada");
    error.name = "AbortError";
    return error;
}

function extraerUrlDirecta(texto){
    // Se permiten "[", "]", "(" y ")" porque forman parte de muchos nombres de
    // archivo (p. ej. "[v1.79.b056]"); solo se recortan los cierres sobrantes
    // que vienen de la sintaxis Markdown/HTML que rodea al enlace.
    const coincidencia = (texto || "").match(/https:\/\/download\d+\.mediafire\.com\/[^"'\s<>]+/);

    if(!coincidencia) return null;

    let url = coincidencia[0];
    const cuenta = (c) => url.split(c).length - 1;

    while(
        (url.endsWith(")") && cuenta(")") > cuenta("(")) ||
        (url.endsWith("]") && cuenta("]") > cuenta("["))
    ){
        url = url.slice(0, -1);
    }

    return url.replace(/&amp;/g, "&");
}

async function solicitar(url, signal, opciones = {}){
    const respuesta = await fetch(url, { signal, cache: "no-store", ...opciones });

    if(!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);

    return respuesta;
}

// Obtiene la URL directa de descarga de un archivo de MediaFire. La página
// se descarga a través de proxies CORS y se extrae el enlace del botón "Descargar".
async function obtenerUrlDirecta(link, signal){
    const quickkey = (link.match(RE_ARCHIVO_MEDIAFIRE) || [])[1];

    if(!quickkey) throw new Error("Enlace de MediaFire no válido");

    // URL canónica con solo el quickkey: evita problemas de codificación
    // con el nombre del archivo (apóstrofes, corchetes, espacios...).
    const urlPagina = "https://www.mediafire.com/file/" + quickkey;

    // La API oficial solo se usa para validar que el archivo exista. Su
    // "normal_download" viene doblemente codificado ("%255B") cuando el nombre
    // tiene corchetes y el proxy no encuentra el enlace en esa página.
    try{
        const r = await solicitar(
            `https://www.mediafire.com/api/1.4/file/get_info.php?quick_key=${encodeURIComponent(quickkey)}&response_format=json`,
            signal
        );
        const info = (await r.json())?.response?.file_info;

        if(info?.ready === "no") throw new Error("Archivo no disponible");

    }catch(error){
        if(signal?.aborted) throw errorAbortado();
        // Si la API falla se continúa con la URL canónica
    }

    // X-No-Cache evita que r.jina.ai devuelva una copia con enlace caducado.
    // No se debe añadir "?_t=" a la URL: corrompe la URL objetivo del proxy.
    // X-With-Links-Summary añade la lista de enlaces de la página: en algunos
    // archivos (p. ej. los .partN.rar grandes) el botón "Download" no aparece
    // en el Markdown y solo está en esa lista.
    const sinCache = { headers: { "X-No-Cache": "true", "X-With-Links-Summary": "true" } };

    const fuentes = [
        async (s) => (await solicitar("https://r.jina.ai/" + encodeURI(urlPagina), s, sinCache)).text(),
        async (s) => (await (await solicitar("https://api.allorigins.win/get?url=" + encodeURIComponent(urlPagina), s)).json())?.contents || "",
        async (s) => (await solicitar("https://api.allorigins.win/raw?url=" + encodeURIComponent(urlPagina), s)).text()
    ];

    let ultimoError = null;

    for(const obtener of fuentes){
        // Cada fuente tiene su propio límite de 12 s, además de la cancelación externa
        const control = new AbortController();
        const temporizador = setTimeout(() => control.abort(), 12000);
        const alCancelar = () => control.abort();

        if(signal?.aborted) control.abort();
        else signal?.addEventListener("abort", alCancelar, { once: true });

        try{
            const directa = extraerUrlDirecta(await obtener(control.signal));

            if(!directa) throw new Error("La página no contiene un enlace de descarga");

            return directa;

        }catch(error){
            if(signal?.aborted) throw errorAbortado();
            ultimoError = error;

        }finally{
            clearTimeout(temporizador);
            signal?.removeEventListener("abort", alCancelar);
        }
    }

    throw ultimoError || new Error("Ninguna fuente respondió");
}

/* ========= FONDO ANIMADO ========= */
const canvas = document.getElementById("stars");

if(canvas){
    const ctx = canvas.getContext("2d");
    const intervalo = 1000 / 30;
    const cantidad = window.matchMedia("(max-width: 768px)").matches ? 30 : 80;

    let estrellas = [];
    let frameId = null;
    let ultimoTiempo = 0;

    const estrellaNueva = () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.2,
        speed: Math.random() * 0.3 + 0.05
    });

    function ajustarCanvas(){
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        estrellas = Array.from({ length: cantidad }, estrellaNueva);
    }

    function dibujar(tiempo){
        frameId = requestAnimationFrame(dibujar);

        if(tiempo - ultimoTiempo < intervalo) return;
        ultimoTiempo = tiempo;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";

        for(const s of estrellas){
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();

            s.y += s.speed;

            if(s.y > canvas.height){
                s.y = 0;
                s.x = Math.random() * canvas.width;
            }
        }
    }

    ajustarCanvas();
    dibujar(0);

    window.addEventListener("resize", ajustarCanvas);

    // Se pausa la animación cuando la pestaña no está visible
    document.addEventListener("visibilitychange", () => {
        if(document.hidden){
            cancelAnimationFrame(frameId);
            frameId = null;
        }else if(!frameId){
            ultimoTiempo = 0;
            dibujar(performance.now());
        }
    });
}

/* ========= CARRITO ========= */
let carrito = [];
let comprados = [];

function agregarAlCarrito(nombre, link, img){
    if(carrito.some(item => item.link === link)){
        mostrarToast(`${nombre} ya está en el carrito.`, "aviso");
        return;
    }

    carrito.push({ nombre, link, img });
    actualizarContadorCarrito();
    mostrarToast(`${nombre} se agregó al carrito.`);
}

function actualizarContadorCarrito(){
    const contador = document.getElementById("cartCount");
    if(contador) contador.textContent = carrito.length;

    const checkout = document.getElementById("btnCheckout");
    if(checkout) checkout.disabled = carrito.length === 0;
}

function renderCarrito(){
    const contenedor = document.getElementById("cartItemsContainer");
    if(!contenedor) return;

    if(carrito.length === 0){
        contenedor.innerHTML = `
            <div style="text-align:center; color:#94a3b8; margin-top:20px;">
                <i class="fa-solid fa-box-open" style="font-size:32px; margin-bottom:10px; display:block;"></i>
                <p>El carrito está vacío</p>
            </div>`;
        return;
    }

    contenedor.innerHTML = carrito.map((item, index) => `
        <div class="cart-item">
            <img ${atributosImg(item.img, 120)} class="cart-item-img" alt="">
            <span title="${esc(item.nombre)}">${esc(item.nombre)}</span>
            <button onclick="eliminarDelCarrito(${index})" title="Eliminar"><i class="fa-solid fa-trash-can"></i></button>
        </div>`).join("");
}

function abrirCarrito(){
    playClick();
    renderCarrito();
    abrirModal("cartBox");
}

function cerrarCarrito(){
    playClick();
    cerrarModal("cartBox");
}

function eliminarDelCarrito(index){
    carrito.splice(index, 1);
    actualizarContadorCarrito();
    renderCarrito();
}

function realizarCompra(){
    if(carrito.length === 0) return;

    playClick();
    cerrarModal("cartBox");

    comprados = carrito;
    carrito = [];
    actualizarContadorCarrito();

    const contenedor = document.getElementById("successDownloadsContainer");

    if(contenedor){
        contenedor.innerHTML = comprados.map(item => `
            <button class="download-link-btn" data-link="${esc(item.link)}" data-nombre="${esc(item.nombre)}">
                <i class="fa-solid fa-download"></i> ${esc(item.nombre)}
            </button>`).join("");
    }

    abrirModal("purchaseSuccessBox");
}

const esperar = (ms) => new Promise(resolver => setTimeout(resolver, ms));

async function descargarTodo(){
    if(comprados.length === 0) return;

    playClick();
    cerrarModal("purchaseSuccessBox");

    const items = comprados;
    comprados = [];

    let iniciadas = 0;
    let enPestana = 0;

    for(const { link } of items){
        if(!link || !link.trim()) continue;

        if(RE_DESCARGA_DIRECTA.test(link)){
            iniciarDescarga(link);
            iniciadas++;

        }else if(RE_ARCHIVO_MEDIAFIRE.test(link)){
            const control = new AbortController();
            const temporizador = setTimeout(() => control.abort(), 10000);

            try{
                iniciarDescarga(await obtenerUrlDirecta(link, control.signal));
                iniciadas++;
            }catch(error){
                window.open(link, "_blank", "noopener");
                enPestana++;
            }finally{
                clearTimeout(temporizador);
            }

        }else{
            window.open(link, "_blank", "noopener");
            enPestana++;
        }

        // Pausa entre descargas para que el navegador no bloquee las siguientes
        await esperar(2000);
    }

    mostrarToast(`Descargas iniciadas: ${iniciadas}. Abiertas en pestaña: ${enPestana}.`);
}

function cerrarSuccessModal(){
    playClick();
    cerrarModal("purchaseSuccessBox");
}

/* ========= AVATAR ALEATORIO ========= */
(function asignarAvatar(){
    const total = 172; // assets/pfp/sprite_0.png ... sprite_171.png
    const ruta = `assets/pfp/sprite_${Math.floor(Math.random() * total)}.png`;

    for(const id of ["randomAdminPfp", "randomLoginPfp"]){
        const img = document.getElementById(id);
        if(img) img.src = ruta;
    }
})();
