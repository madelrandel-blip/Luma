/* =========================
   LUMA SWITCH - script.js
   ========================= */

/* ========= VARIABLES GLOBALES ========= */
let admin = false;
let editIndex = null;
let guardando = false;
let cargando = false;

let juegosData = [];
let paginaActual = 1;
const juegosPorPagina = 14;

/* ========= ELEMENTOS ========= */
const loginBox = document.getElementById("loginBox");
const emuladoresBox = document.getElementById("emuladoresBox");
const recursosBox = document.getElementById("recursosBox");
const adminPanel = document.getElementById("adminPanel");
const logoutBtn = document.getElementById("logoutBtn");
const panelToggleBtn = document.getElementById("panelToggleBtn");

const buscador = document.getElementById("buscador");
const store = document.getElementById("store");
const pagination = document.getElementById("pagination");

const bgMusic = document.getElementById("bgMusic");
const musicBtn = document.getElementById("musicBtn");
const clickSound = document.getElementById("clickSound");
const adminSound = document.getElementById("adminSound");
const discordSound = document.getElementById("discordSound");
const loadingSound = document.getElementById("loadingSound");
const volumeSlider = document.getElementById("volumeSlider");
const donationSound = document.getElementById("donationSound");

/* ========= AUDIO ========= */
if(clickSound){
    clickSound.volume = 0.1;

    document.addEventListener("click", () => {
        clickSound.play().then(() => {
            clickSound.pause();
            clickSound.currentTime = 0;
        }).catch(() => {});
    }, { once: true });
}

function playClick(){
    if(!clickSound) return;

    clickSound.pause();
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {});
}

if(adminSound){
    adminSound.volume = 0.14;
}

function playAdminClick(){
    if(!adminSound) return;

    adminSound.pause();
    adminSound.currentTime = 0;
    adminSound.play().catch(() => {});
}

if(discordSound){
    discordSound.volume = 0.15;
}

function playDiscordClick(){
    if(!discordSound) return;

    discordSound.pause();
    discordSound.currentTime = 0;
    discordSound.play().catch(() => {});
}

if (donationSound) {
    donationSound.volume = 0.15;
}

function playDonationClick() {
    if (!donationSound) return;

    donationSound.pause();
    donationSound.currentTime = 0;
    donationSound.play().catch(() => {});
}

const musicIcon = document.getElementById("musicIcon");
const volumeIcon = document.getElementById("volumeIcon");
const musicPlaylist = document.getElementById("musicPlaylist");

let playlist = [];
let trackIndex = 0;
let sonidoMuteado = false;

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

        if(musicBtn){
            musicBtn.innerHTML = "▶";
        }

        cargarPlaylist();
    });

    // Al terminar una canción, pasa a la siguiente
    bgMusic.addEventListener("ended", () => {
        nextTrack(false);
    });
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

/* ========= PLAYLIST ========= */
async function cargarPlaylist(){
    try{
        const respuesta = await fetch("data/playlist.json", { cache: "no-store" });

        if(!respuesta.ok) throw new Error("No se pudo cargar la playlist");

        const datos = await respuesta.json();

        playlist = Array.isArray(datos) ? datos : [];

        if(playlist.length > 0){
            const aleatorio = Math.floor(Math.random() * playlist.length);
            trackIndex = aleatorio;
            bgMusic.src = playlist[aleatorio].src;
        }

        actualizarIcono();

        construirPlaylist();

    }catch(error){
        console.error("Error cargando playlist:", error);
    }
}

/* ========= SUBMENÚ DE PLAYLIST ========= */
function construirPlaylist(){
    if(!musicPlaylist) return;

    musicPlaylist.innerHTML = "";

    playlist.forEach((cancion, indice) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "playlist-item";
        item.dataset.indice = indice;

        const img = document.createElement("img");
        img.src = cancion.icono || "assets/images/Luma icon.webp";
        img.alt = cancion.nombre || "Canción";

        const nombre = document.createElement("span");
        nombre.textContent = cancion.nombre || "Sin nombre";

        item.appendChild(img);
        item.appendChild(nombre);

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

    Array.from(musicPlaylist.children).forEach((item) => {
        item.classList.toggle("active", Number(item.dataset.indice) === trackIndex);
    });
}

function togglePlaylist(){
    if(!musicPlaylist) return;

    playClick();

    if(musicPlaylist.classList.contains("open")){
        cerrarPlaylist();
    }else{
        marcarActiva();
        posicionarPlaylist();
        musicPlaylist.classList.add("open");
    }
}

function cerrarPlaylist(){
    if(musicPlaylist) musicPlaylist.classList.remove("open");
}

function posicionarPlaylist(){
    if(!musicIcon || !musicPlaylist) return;

    const reproductor = document.querySelector(".music-control");
    const rect = reproductor ? reproductor.getBoundingClientRect() : musicIcon.getBoundingClientRect();
    const menuWidth = 240;
    const margen = 8;

    let left = rect.left;
    if(left + menuWidth > window.innerWidth - margen){
        left = window.innerWidth - menuWidth - margen;
    }
    if(left < margen) left = margen;

    musicPlaylist.style.left = left + "px";

    const esMovil = window.innerWidth <= 768;

    if(esMovil){
        // La barra está abajo: el menú se abre hacia arriba
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
    musicPlaylist.addEventListener("click", (e) => {
        e.stopPropagation();
    });

    document.addEventListener("click", () => {
        cerrarPlaylist();
    });

    window.addEventListener("scroll", (e) => {
        if(musicPlaylist && e.target && musicPlaylist.contains(e.target)) return;
        cerrarPlaylist();
    }, true);

    window.addEventListener("resize", () => {
        cerrarPlaylist();
    });
}

function reproducirTrack(indice){
    if(!bgMusic || playlist.length === 0) return;

    if(indice < 0) indice = playlist.length - 1;
    if(indice >= playlist.length) indice = 0;

    trackIndex = indice;

    const cancion = playlist[trackIndex];

    bgMusic.src = cancion.src;

    bgMusic.muted = false;

    bgMusic.play().then(() => {
        if(musicBtn) musicBtn.innerHTML = "⏸";
        if(musicIcon) musicIcon.classList.add("playing");
    }).catch(error => {
        console.log("Autoplay bloqueado:", error);
    });

    actualizarIcono();
}

function reproducirMusica(){
    if(!bgMusic || playlist.length === 0) return;

    bgMusic.muted = false;

    bgMusic.play().then(() => {
        if(musicBtn) musicBtn.innerHTML = "⏸";
        if(musicIcon) musicIcon.classList.add("playing");
    }).catch(error => {
        console.log("Autoplay bloqueado:", error);
    });
}

function pausarMusica(){
    if(!bgMusic) return;

    bgMusic.pause();

    if(musicBtn) musicBtn.innerHTML = "▶";
    if(musicIcon) musicIcon.classList.remove("playing");
}

function actualizarIcono(){
    if(playlist.length === 0) return;

    const cancion = playlist[trackIndex];

    if(musicIcon){
        musicIcon.src = cancion.icono || "assets/images/Luma icon.webp";
        musicIcon.title = cancion.nombre || "Luma Switch";
    }

    const musicTitle = document.getElementById("musicTitle");
    const musicTitleInner = document.getElementById("musicTitleInner");

    if(musicTitle){
        const nombre = cancion.nombre || "Luma Switch";

        if(musicTitleInner){
            musicTitleInner.textContent = nombre;
        }else{
            musicTitle.textContent = nombre;
        }

        musicTitle.title = nombre;

        musicTitle.classList.remove("scrolling");
        void musicTitle.offsetWidth;

        if(musicTitle.scrollWidth > musicTitle.clientWidth){
            musicTitle.style.setProperty(
                "--scroll-dist",
                (musicTitle.scrollWidth - musicTitle.clientWidth) + "px"
            );
            musicTitle.classList.add("scrolling");
        }
    }

    marcarActiva();
}

function toggleMusic(){
    playClick();

    if(!bgMusic) return;

    if(bgMusic.paused){
        reproducirMusica();
    }else{
        pausarMusica();
    }
}

function nextTrack(conClick = true){
    if(conClick) playClick();

    if(playlist.length === 0) return;

    reproducirTrack(trackIndex + 1);
}

function prevTrack(){
    playClick();

    if(playlist.length === 0) return;

    reproducirTrack(trackIndex - 1);
}

/* ========= BIENVENIDA ========= */
function aceptarBienvenida(){
    const pantalla = document.getElementById("welcomeScreen");

    if(bgMusic){
        reproducirMusica();
    }

    if(pantalla){
        pantalla.style.transition = "opacity 0.5s ease";
        pantalla.style.opacity = "0";
        pantalla.style.pointerEvents = "none";

        setTimeout(() => {
            pantalla.style.display = "none";
        }, 500);
    }
}

const acceptBtn = document.querySelector("#welcomeScreen .accept-btn");

if(acceptBtn){
    acceptBtn.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();

        playClick();
        aceptarBienvenida();
    });
}

/* ========= LOGIN ========= */
function abrirLogin(){
    playAdminClick();
    if(loginBox) loginBox.style.display = "flex";
}

function cerrarLogin(){
    if(loginBox) loginBox.style.display = "none";
}

/* ========= PANEL ADMIN TOGGLE ========= */
window.toggleAdminPanel = function(){
    if(!adminPanel) return;
    playAdminClick();
    const visible = adminPanel.style.display === "block";
    adminPanel.style.display = visible ? "none" : "block";
};

/* ========= EMULADORES ========= */
function abrirEmuladores(){
    playClick();

    if(emuladoresBox){
        emuladoresBox.style.display = "flex";
    }

    if(typeof cargarEmuladores === "function"){
        cargarEmuladores();
    }
}

function cerrarEmuladores(){
    if(emuladoresBox){
        emuladoresBox.style.display = "none";
    }
}

/* ========= RECURSOS ========= */
function abrirRecursos(){
    playClick();

    if(recursosBox){
        recursosBox.style.display = "flex";
    }

    if(typeof cargarRecursos === "function"){
        cargarRecursos();
    }
}

function cerrarRecursos(){
    if(recursosBox){
        recursosBox.style.display = "none";
    }
}

/* ========= DISCORD ========= */
function abrirDiscord(){
    playDiscordClick();
    window.open("https://discord.gg/pMvkz2RzkJ", "_blank");
}

/* ========= BUSCADOR ========= */
if(buscador){
    let temporizadorBusqueda = null;

    buscador.addEventListener("input", () => {
        clearTimeout(temporizadorBusqueda);

        temporizadorBusqueda = setTimeout(() => {
            const texto = buscador.value.toLowerCase();

            paginaActual = 1;

            render(
                juegosData.filter(j =>
                    j.nombre.toLowerCase().includes(texto) ||
                    j.desc.toLowerCase().includes(texto)
                )
            );
        }, 200);
    });
}

/* ========= LINKS ========= */
function abrirPreview(btn){
    const img = btn.dataset.img || "";
    const nombre = btn.dataset.nombre || "";
    const link1 = btn.dataset.link1 || "";
    const link2 = btn.dataset.link2 || "";
    const screenshots = JSON.parse(btn.dataset.screenshots || "[]");
    const trailer = btn.dataset.trailer || "";
    const rating = btn.dataset.rating || "";
    const genre = btn.dataset.genre || "";
    const developer = btn.dataset.developer || "";
    const desc = btn.dataset.desc || "";
    const size = btn.dataset.size || "";
    const format = btn.dataset.format || "";
    const languages = btn.dataset.languages || "";
    const update = btn.dataset.update || "";
    const gameId = btn.dataset.gameid || "";
    const firmware = btn.dataset.firmware || "";
    const mode = btn.dataset.mode || "";
    const year = btn.dataset.year || "";

    const tienePreview = screenshots.length > 0 || trailer || desc || genre || developer || gameId;
    if(!tienePreview){
        abrirLink(link1, nombre);
        return;
    }

    mostrarPreview(img, nombre, link1, link2, screenshots, trailer, rating, genre, developer, desc, size, format, languages, update, gameId, firmware, mode, year);
}

function mostrarPreview(img, nombre, link1, link2, screenshots, trailer, rating, genre, developer, desc, size, format, languages, update, gameId, firmware, mode, year){
    const box = document.getElementById("previewBox");
    const previewImg = document.getElementById("previewImg");
    const previewNombre = document.getElementById("previewNombre");
    const previewDesc = document.getElementById("previewDescModal");
    const previewMeta = document.getElementById("previewMeta");
    const previewLinks = document.getElementById("previewLinks");
    const previewMain = document.getElementById("previewMain");
    const previewThumbs = document.getElementById("previewThumbs");
    const previewFileInfo = document.getElementById("previewFileInfo");

    if(!box) return;

    previewImg.src = img || "";
    previewNombre.textContent = nombre || "";
    previewDesc.textContent = desc || "";

    let fileInfo = "";
    if(gameId) fileInfo += `<div class="fi"><b>ID:</b> ${gameId}</div>`;
    if(size) fileInfo += `<div class="fi"><b>Peso:</b> ${size}</div>`;
    if(languages) fileInfo += `<div class="fi"><b>Idiomas:</b> ${languages}</div>`;
    if(format) fileInfo += `<div class="fi"><b>Formato:</b> ${format}</div>`;
    if(firmware) fileInfo += `<div class="fi"><b>Firmware:</b> ${firmware}</div>`;
    if(update) fileInfo += `<div class="fi"><b>Actualizacion:</b> ${update}</div>`;
    previewFileInfo.innerHTML = fileInfo;

    let meta = "";
    if(genre) meta += `<div class="fi-col"><span class="label">Género</span><span class="value">${genre}</span></div>`;
    if(mode) meta += `<div class="fi-col"><span class="label">Jugadores</span><span class="value">${mode}</span></div>`;
    if(developer) meta += `<div class="fi-col"><span class="label">Desarrolladora</span><span class="value">${developer}</span></div>`;
    if(year) meta += `<div class="fi-col"><span class="label">Año</span><span class="value">${year}</span></div>`;
    if(rating) meta += `<div class="fi-col"><span class="label">Valoración</span><span class="value gold">${rating}</span></div>`;
    previewMeta.innerHTML = meta;

    let botones = "";
    if(link1) botones += `<button class="btn blue" onclick="playClick();cerrarPreview();abrirLink('${escapeComillas(link1)}', '${escapeComillas(nombre)}')">Obtener</button>`;
    if(link2) botones += `<button class="btn green" onclick="playClick();cerrarPreview();abrirLink('${escapeComillas(link2)}', '${escapeComillas(nombre)} (Tutorial)')">Tutorial</button>`;
    previewLinks.innerHTML = botones;

    let thumbs = "";
    let mainSrc = "";

    if(screenshots && screenshots.length > 0){
        mainSrc = screenshots[0];
        thumbs = screenshots.map((s,i) => `<img class="thumb${i===0?' active':''}" src="${s}" loading="lazy" onclick="verEnMain('${s}',this)">`).join("");
    }

    let trailerSrc = "";
    if(trailer){
        const videoId = trailer.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
        if(videoId){
            trailerSrc = videoId[1];
            thumbs += `<div class="thumb thumb-video" onclick="verTrailerEnMain('${trailerSrc}',this)"><img src="https://img.youtube.com/vi/${trailerSrc}/mqdefault.jpg" loading="lazy"><div class="play-icon"></div></div>`;
        }
    }

    if(mainSrc) previewMain.innerHTML = `<img src="${mainSrc}">`;
    else if(trailerSrc) previewMain.innerHTML = `<iframe src="https://www.youtube.com/embed/${trailerSrc}" allowfullscreen></iframe>`;
    else previewMain.innerHTML = "";

    previewThumbs.innerHTML = thumbs;

    previewMain.dataset.trailer = trailerSrc || "";

    box.style.display = "flex";
}

function cerrarPreview(){
    detenerTrailer();
    const box = document.getElementById("previewBox");
    if(box) box.style.display = "none";
}

function detenerTrailer(){
    const main = document.getElementById("previewMain");
    if(main) main.innerHTML = "";

    if(window._musicaPausadaPorTrailer){
        window._musicaPausadaPorTrailer = false;
        reproducirMusica();
    }
}

function verEnMain(src, el){
    detenerTrailer();
    const main = document.getElementById("previewMain");
    if(!main) return;
    main.innerHTML = `<img src="${src}">`;
    document.querySelectorAll(".preview-thumbs .thumb").forEach(t => t.classList.remove("active"));
    el.classList.add("active");
}

function verTrailerEnMain(videoId, el){
    const main = document.getElementById("previewMain");
    if(!main) return;

    if(!bgMusic.paused){
        pausarMusica();
        window._musicaPausadaPorTrailer = true;
    }

    main.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" allowfullscreen></iframe>`;
    document.querySelectorAll(".preview-thumbs .thumb").forEach(t => t.classList.remove("active"));
    el.classList.add("active");
}

function abrirLink(link, nombre){
    if(!link || link.trim() === ""){
        alert("No hay enlace disponible");
        return;
    }

    // Enlaces de archivo de MediaFire: descarga directa sin abrir pestaña
    if(/mediafire\.com\/file\//.test(link)){
        descargarMediafire(link, null, nombre);
        return;
    }

    // URL directa de descarga de MediaFire (download###.mediafire.com)
    if(/download\d+\.mediafire\.com\//.test(link)){
        descargarMediafire(link, link, nombre);
        return;
    }

    window.open(link, "_blank");
}

let descargaController = null;
let descargaIntervalo = null;
let mutePrevioDescarga = null;
let fallbackLink = null;
let descargaTimerPestana = null;

function silenciarMusicaDuranteDescarga(){
    if(!bgMusic || mutePrevioDescarga) return;

    mutePrevioDescarga = {
        muted: bgMusic.muted,
        sonidoMuteado: sonidoMuteado
    };

    bgMusic.muted = true;
}

function restaurarMusicaDespuesDescarga(){
    if(!bgMusic || !mutePrevioDescarga) return;

    bgMusic.muted = mutePrevioDescarga.muted;
    sonidoMuteado = mutePrevioDescarga.sonidoMuteado;
    mutePrevioDescarga = null;

    actualizarVolumenUI();
}

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

function descargarMediafire(link, directaPrevia, nombre){
    const box = document.getElementById("descargaBox");
    const barra = document.getElementById("descargaProgress");
    const estado = document.getElementById("descargaEstado");
    const boton = document.getElementById("descargaFallback");
    const nombreEl = document.getElementById("descargaNombre");

    if(!box || !barra || !estado) return;

    box.style.display = "flex";
    barra.style.width = "0%";
    estado.textContent = "Preparando el enlace...";
    if(nombreEl) nombreEl.textContent = nombre || "";

    // El botón "Abrir en pestaña" solo se muestra si la descarga automática falla
    fallbackLink = null;
    if(boton) boton.style.display = "none";

    playLoadingSound();

    silenciarMusicaDuranteDescarga();

    // Limpiar cualquier descarga previa
    if(descargaController) descargaController.abort();
    descargaController = new AbortController();
    if(descargaIntervalo) clearInterval(descargaIntervalo);
    if(descargaTimerPestana) clearTimeout(descargaTimerPestana);

    let progreso = 0;
    let terminadoPorTiempo = false;

    descargaIntervalo = setInterval(() => {
        if(progreso < 90){
            progreso += Math.random() * 12 + 3;
            if(progreso > 90) progreso = 90;
            barra.style.width = progreso + "%";
        }
    }, 120);

    // Si la descarga automática tarda demasiado, se cancela el intento
    // y se abre la pestaña (o se deja el botón si el navegador lo bloquea)
    descargaTimerPestana = setTimeout(() => {
        terminadoPorTiempo = true;
        if(descargaController) descargaController.abort();
        abrirPestanaOfallback(link, "La descarga automática tardó demasiado.");
    }, 20000);

    const exito = (mensaje) => {
        if(descargaTimerPestana){ clearTimeout(descargaTimerPestana); descargaTimerPestana = null; }
        stopLoadingSound();
        restaurarMusicaDespuesDescarga();
        clearInterval(descargaIntervalo);
        descargaIntervalo = null;
        descargaController = null;
        barra.style.width = "100%";
        estado.textContent = mensaje;
        setTimeout(() => cerrarDescarga(), 2000);
    };

    const fallo = (mensaje) => {
        if(descargaTimerPestana){ clearTimeout(descargaTimerPestana); descargaTimerPestana = null; }
        stopLoadingSound();
        restaurarMusicaDespuesDescarga();
        clearInterval(descargaIntervalo);
        descargaIntervalo = null;
        descargaController = null;
        barra.style.width = progreso + "%";
        abrirPestanaOfallback(link, mensaje);
    };

    if(!directaPrevia){
        const quickkey = (link.match(/mediafire\.com\/file\/([^\/]+)\//) || [])[1];

        if(!quickkey){
            fallo("No se pudo procesar el enlace automáticamente.");
            return;
        }
    }

    if(directaPrevia){
        iniciarDescarga(directaPrevia);
        exito("Descarga iniciada ✔");
        return;
    }

    // Traer la página de MediaFire en segundo plano (vía proxies CORS)
    // y extraer la URL directa del botón "Descargar".
    obtenerUrlDirecta(link, descargaController.signal)
        .then(directa => {
            iniciarDescarga(directa);
            exito("Descarga iniciada ✔");
        })
        .catch(error => {
            if(terminadoPorTiempo) return;
            if(error && error.name === "AbortError"){
                cerrarDescarga();
                return;
            }
            fallo("No se pudo iniciar la descarga automáticamente.");
        });
}

function abrirPestanaOfallback(link, mensaje){
    stopLoadingSound();
    restaurarMusicaDespuesDescarga();

    if(descargaIntervalo){ clearInterval(descargaIntervalo); descargaIntervalo = null; }

    // Intenta abrir la pestaña automáticamente; si el navegador lo bloquea
    // (por no ser un clic del usuario), se muestra el botón manual.
    const ventana = window.open(link, "_blank");

    if(ventana){
        if(descargaController) descargaController.abort();
        descargaController = null;
        const box = document.getElementById("descargaBox");
        if(box) box.style.display = "none";
    }else{
        mostrarFallback(link, mensaje);
    }
}

function mostrarFallback(link, mensaje){
    fallbackLink = link;

    const boton = document.getElementById("descargaFallback");
    const estado = document.getElementById("descargaEstado");

    if(estado) estado.textContent = mensaje + " Toca el botón de abajo para abrirlo en una pestaña.";
    if(boton) boton.style.display = "block";
}

function abrirEnlaceFallback(){
    if(!fallbackLink) return;

    const link = fallbackLink;
    fallbackLink = null;

    window.open(link, "_blank");
    cerrarDescarga();
}

function extraerUrlDirecta(texto){
    const match = (texto || "").match(/https:\/\/download\d+\.mediafire\.com\/[^"'\s<>\]\)]+/);
    return match ? match[0].replace(/&amp;/g, "&") : null;
}

async function obtenerUrlDirecta(link, signal){
    const quickkey = (link.match(/mediafire\.com\/file\/([^\/]+)\//) || [])[1];

    if(!quickkey){
        throw new Error("Sin quickkey");
    }

    // URL canónica: solo el quickkey, sin el nombre del archivo.
    // Evita errores de encoding (apóstrofes, corchetes, %, +, espacios...).
    let urlPagina = "https://www.mediafire.com/file/" + quickkey;

    // La API oficial de MediaFire tiene CORS abierto (*) y es muy fiable.
    // Valida que el archivo exista y está listo, y da su URL canónica.
    try{
        const r = await fetch("https://www.mediafire.com/api/1.4/file/get_info.php?quick_key=" + encodeURIComponent(quickkey) + "&response_format=json", { signal, cache: "no-store" });
        if(r.ok){
            const d = await r.json();
            const fi = d && d.response && d.response.file_info;
            if(fi && fi.ready === "no") throw new Error("Archivo no disponible");
            if(fi && fi.links && fi.links.normal_download) urlPagina = fi.links.normal_download;
        }
    }catch(error){
        if(signal && signal.aborted){
            const err = new Error("Abortado");
            err.name = "AbortError";
            throw err;
        }
        // Si la API falla, se continúa con la URL canónica simple
    }

    const fuentes = [
        {
            obtener: async (s) => {
                // Header `X-No-Cache` para que r.jina.ai no sirva una copia cacheada
                // con una dkey caducada. NO usar `?_t=` en la URL: corrompe la URL
                // objetivo de r.jina.ai (a veces pierde el quickkey y falla).
                const r = await fetch("https://r.jina.ai/" + encodeURI(urlPagina), { signal: s, cache: "no-store", headers: { "X-No-Cache": "true" } });
                if(!r.ok) throw new Error("HTTP " + r.status);
                return r.text();
            }
        },
        {
            obtener: async (s) => {
                const r = await fetch("https://r.jina.ai/" + encodeURI(link), { signal: s, cache: "no-store", headers: { "X-No-Cache": "true" } });
                if(!r.ok) throw new Error("HTTP " + r.status);
                return r.text();
            }
        },
        {
            obtener: async (s) => {
                const r = await fetch("https://api.allorigins.win/get?url=" + encodeURIComponent(urlPagina), { signal: s, cache: "no-store" });
                if(!r.ok) throw new Error("HTTP " + r.status);
                const d = await r.json();
                return (d && d.contents) || "";
            }
        },
        {
            obtener: async (s) => {
                const r = await fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent(urlPagina), { signal: s, cache: "no-store" });
                if(!r.ok) throw new Error("HTTP " + r.status);
                return r.text();
            }
        }
    ];

    let ultimoError = null;

    for(const fuente of fuentes){
        const control = new AbortController();
        const temporizador = setTimeout(() => control.abort(), 12000);

        const alCancelar = () => control.abort();

        if(signal){
            if(signal.aborted){
                control.abort();
            }else{
                signal.addEventListener("abort", alCancelar, { once: true });
            }
        }

        try{
            const texto = await fuente.obtener(control.signal);

            const directa = extraerUrlDirecta(texto);

            if(!directa) throw new Error("Sin URL directa");

            return directa;
        }catch(error){
            if(signal && signal.aborted){
                const err = new Error("Abortado");
                err.name = "AbortError";
                throw err;
            }
            ultimoError = error;
        }finally{
            clearTimeout(temporizador);
            if(signal) signal.removeEventListener("abort", alCancelar);
        }
    }

    throw ultimoError || new Error("Sin método disponible");
}

function iniciarDescarga(directa){
    const a = document.createElement("a");
    a.href = directa;
    a.download = "";
    a.style.display = "none";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function cerrarDescarga(){
    stopLoadingSound();
    restaurarMusicaDespuesDescarga();

    if(descargaController) descargaController.abort();
    descargaController = null;
    if(descargaIntervalo){ clearInterval(descargaIntervalo); descargaIntervalo = null; }
    if(descargaTimerPestana){ clearTimeout(descargaTimerPestana); descargaTimerPestana = null; }

    const box = document.getElementById("descargaBox");
    if(box) box.style.display = "none";

    const nombreEl = document.getElementById("descargaNombre");
    if(nombreEl) nombreEl.textContent = "";
}

function escapeComillas(str){
    return (str || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function render(lista){
    if(!store) return;

    let html = "";

    const inicio = (paginaActual - 1) * juegosPorPagina;
    const fin = inicio + juegosPorPagina;

    // IMPORTANTE: esto faltaba
    const juegosPagina = lista.slice(inicio, fin);

    juegosPagina.forEach(j => {
        html += `
        <div class="card">
            <img src="${j.img}" loading="lazy" decoding="async" alt="${j.nombre}">

            <div class="content">
                <div class="info-overlay">
                    <h3>${j.nombre}</h3>
                    <p>${j.desc}</p>
                </div>

                <div class="btns">
                    ${(j.link1 || j.link2) ? `<button class="btn blue" onclick="playClick();abrirPreview(this)" data-img="${j.img}" data-nombre="${j.nombre}" data-link1="${j.link1||''}" data-link2="${j.link2||''}" data-screenshots='${JSON.stringify(j.screenshots||[])}' data-trailer="${j.trailer||''}" data-rating="${j.rating||''}" data-genre="${j.genre||''}" data-developer="${j.developer||''}" data-desc="${j.previewDesc||''}" data-size="${j.size||''}" data-format="${j.format||''}" data-languages="${j.languages||''}" data-update="${j.update||''}" data-gameid="${j.gameId||''}" data-firmware="${j.firmware||''}" data-mode="${j.mode||''}" data-year="${j.year||''}">Ver enlace</button>` : ''}
                    ${j.link1 ? `<button class="btn blue cart-add-btn" onclick="playClick();agregarAlCarrito('${escapeComillas(j.nombre)}', '${escapeComillas(j.link1)}', '${escapeComillas(j.img)}')"><i class="fa-solid fa-cart-arrow-down"></i> Agregar</button>` : ''}
                    ${j.link2 ? `<button class="btn green cart-add-btn" onclick="playClick();agregarAlCarrito('${escapeComillas(j.nombre)} (Parte 2)', '${escapeComillas(j.link2)}', '${escapeComillas(j.img)}')"><i class="fa-solid fa-cart-arrow-down"></i> Agregar</button>` : ''}
                </div>

                ${admin ? `
                <div class="admin-actions">
                    <button onclick="eliminar('${j.id}')">🗑️</button>
                </div>` : ""}
            </div>
        </div>`;
    });

    store.innerHTML = html;

    renderPagination(lista.length);
}

/* ========= PAGINACIÓN ========= */
function renderPagination(totalJuegos){
    if(!pagination) return;

    const totalPaginas = Math.ceil(totalJuegos / juegosPorPagina);

    let botones = "";

    botones += `
        <button ${paginaActual === 1 ? "disabled" : ""} 
        onclick="cambiarPagina(${paginaActual - 1})">
            ⬅
        </button>
    `;

    let inicio = Math.max(1, paginaActual - 2);
    let fin = Math.min(totalPaginas, paginaActual + 2);

    if(paginaActual <= 3){
        fin = Math.min(5, totalPaginas);
    }

    if(paginaActual >= totalPaginas - 2){
        inicio = Math.max(1, totalPaginas - 4);
    }

    if(inicio > 1){
        botones += `<button onclick="cambiarPagina(1)">1</button>`;

        if(inicio > 2){
            botones += `<button disabled>...</button>`;
        }
    }

    for(let i = inicio; i <= fin; i++){
        botones += `
            <button 
                class="${i === paginaActual ? "active" : ""}" 
                onclick="cambiarPagina(${i})">
                ${i}
            </button>
        `;
    }

    if(fin < totalPaginas){
        if(fin < totalPaginas - 1){
            botones += `<button disabled>...</button>`;
        }

        botones += `
            <button onclick="cambiarPagina(${totalPaginas})">
                ${totalPaginas}
            </button>
        `;
    }

    botones += `
        <button ${paginaActual === totalPaginas ? "disabled" : ""} 
        onclick="cambiarPagina(${paginaActual + 1})">
            ➡
        </button>
    `;

    pagination.innerHTML = botones;
}

function cambiarPagina(numero){
    if(numero === paginaActual) return;

    playClick();

    if(store){
        store.classList.add("page-transition");
    }

    setTimeout(() => {
        paginaActual = numero;
        render(juegosData);

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

        if(store){
            store.classList.remove("page-transition");
        }
    }, 250);
}

/* ========= ESTRELLAS ========= */
const canvas = document.getElementById("stars");

if(canvas){
    const ctx = canvas.getContext("2d");

    let stars = [];
    let frameId = null;
    let ultimoTiempo = 0;
    const fps = 30;
    const intervalo = 1000 / fps;
    const esMovil = window.matchMedia("(max-width: 768px)").matches;
    const numStars = esMovil ? 30 : 80;

    function resize(){
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function initStars(){
        stars = [];

        for(let i = 0; i < numStars; i++){
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: Math.random() * 1.2,
                speed: Math.random() * 0.3 + 0.05
            });
        }
    }

    function dibujar(tiempo){
        frameId = requestAnimationFrame(dibujar);

        if(tiempo - ultimoTiempo < intervalo) return;
        ultimoTiempo = tiempo;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";

        for(let s of stars){
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

    resize();
    initStars();
    dibujar(0);

    window.addEventListener("resize", () => {
        resize();
        initStars();
    });

    document.addEventListener("visibilitychange", () => {
        if(document.hidden && frameId){
            cancelAnimationFrame(frameId);
            frameId = null;
        }else if(!document.hidden && !frameId){
            ultimoTiempo = 0;
            dibujar(performance.now());
        }
    });
}

// =========================
// DONACIONES
// =========================

function abrirDonaciones() {
    playDonationClick();

    document.getElementById("donacionesBox").style.display = "flex";
}

function cerrarDonaciones() {
    document.getElementById("donacionesBox").style.display = "none";
}

// =========================
// CARRITO DE COMPRAS
// =========================

let carrito = [];

function agregarAlCarrito(nombre, link, img) {
    const existe = carrito.find(item => item.link === link);
    if (!existe) {
        carrito.push({ nombre, link, img });
        actualizarContadorCarrito();
        mostrarToast(`<i class="fa-solid fa-cart-plus" style="color: #10b981;"></i> ${nombre} agregado al carrito`);
    } else {
        mostrarToast(`<i class="fa-solid fa-circle-exclamation" style="color: #f59e0b;"></i> ${nombre} ya está en el carrito`);
    }
}

function actualizarContadorCarrito() {
    const countSpan = document.getElementById("cartCount");
    if (countSpan) countSpan.textContent = carrito.length;
    
    const btnCheckout = document.getElementById("btnCheckout");
    if (btnCheckout) {
        btnCheckout.disabled = carrito.length === 0;
    }
}

function abrirCarrito() {
    playClick();
    const cartBox = document.getElementById("cartBox");
    const container = document.getElementById("cartItemsContainer");
    
    if (carrito.length === 0) {
        container.innerHTML = "<div style='text-align: center; color: #94a3b8; margin-top: 20px;'><i class='fa-solid fa-box-open' style='font-size:32px; margin-bottom:10px; display:block;'></i><p>El carrito está vacío</p></div>";
    } else {
        container.innerHTML = carrito.map((item, index) => `
            <div class="cart-item">
                <img src="${item.img}" class="cart-item-img" alt="Miniatura">
                <span title="${item.nombre}">${item.nombre}</span>
                <button onclick="eliminarDelCarrito(${index})" title="Eliminar"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `).join("");
    }
    
    cartBox.style.display = "flex";
}

function cerrarCarrito() {
    playClick();
    document.getElementById("cartBox").style.display = "none";
}

window.eliminarDelCarrito = function(index) {
    carrito.splice(index, 1);
    actualizarContadorCarrito();
    abrirCarrito();
}

function realizarCompra() {
    if (carrito.length === 0) return;
    playClick();
    cerrarCarrito();

    const items = [...carrito];
    carrito = [];
    actualizarContadorCarrito();

    const container = document.getElementById("successDownloadsContainer");
    if (container) {
        container.innerHTML = items.map(item => `
            <button class="download-link-btn" onclick="abrirLink('${escapeComillas(item.link)}', '${escapeComillas(item.nombre)}')">
                <i class="fa-solid fa-download"></i> ${item.nombre}
            </button>
        `).join("");
    }

    document.getElementById("purchaseSuccessBox").style.display = "flex";
    window._compraItems = items;
}

async function descargarTodo() {
    const items = window._compraItems;
    if (!items || items.length === 0) return;
    playClick();

    document.getElementById("purchaseSuccessBox").style.display = "none";

    let descargados = 0;
    let fallidos = 0;

    for (const item of items) {
        const link = item.link;
        if (!link || !link.trim()) { fallidos++; continue; }

        if (/mediafire\.com\/file\//.test(link)) {
            try {
                const c = new AbortController();
                const t = setTimeout(() => c.abort(), 10000);
                const directa = await obtenerUrlDirecta(link, c.signal);
                clearTimeout(t);
                iniciarDescarga(directa);
                descargados++;
            } catch (e) {
                window.open(link, "_blank");
                fallidos++;
            }
        } else if (/download\d+\.mediafire\.com\//.test(link)) {
            iniciarDescarga(link);
            descargados++;
        } else {
            window.open(link, "_blank");
            fallidos++;
        }

        await new Promise(r => setTimeout(r, 2000));
    }

    window._compraItems = null;
    mostrarToast(`<i class="fa-solid fa-circle-check" style="color: #10b981;"></i> ${descargados} descargado(s), ${fallidos} abierto(s) en pestaña`);
}

function cerrarSuccessModal() {
    playClick();
    document.getElementById("purchaseSuccessBox").style.display = "none";
}

function mostrarToast(mensaje) {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = mensaje;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        if(container.contains(toast)) {
            container.removeChild(toast);
        }
    }, 3000);
}
