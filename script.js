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
const juegosPorPagina = 12;

/* ========= ELEMENTOS ========= */
const loginBox = document.getElementById("loginBox");
const emuladoresBox = document.getElementById("emuladoresBox");
const recursosBox = document.getElementById("recursosBox");
const adminPanel = document.getElementById("adminPanel");
const logoutBtn = document.getElementById("logoutBtn");

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
function abrirLink(link){
    if(!link || link.trim() === ""){
        alert("No hay enlace disponible");
        return;
    }

    // Enlaces de archivo de MediaFire: descarga directa sin abrir pestaña
    if(/mediafire\.com\/file\//.test(link)){
        descargarMediafire(link);
        return;
    }

    window.open(link, "_blank");
}

let descargaController = null;
let descargaIntervalo = null;

function playLoadingSound(){
    if(!loadingSound) return;
    loadingSound.currentTime = 0;
    loadingSound.play().catch(() => {});
}

function stopLoadingSound(){
    if(!loadingSound) return;
    loadingSound.pause();
    loadingSound.currentTime = 0;
}

function descargarMediafire(link){
    const box = document.getElementById("descargaBox");
    const barra = document.getElementById("descargaProgress");
    const estado = document.getElementById("descargaEstado");

    if(!box || !barra || !estado) return;

    box.style.display = "flex";
    barra.style.width = "0%";
    estado.textContent = "Preparando el enlace...";

    playLoadingSound();

    // Limpiar cualquier descarga previa
    if(descargaController) descargaController.abort();
    descargaController = new AbortController();
    if(descargaIntervalo) clearInterval(descargaIntervalo);

    const quickkey = (link.match(/mediafire\.com\/file\/([^\/]+)\//) || [])[1];

    let progreso = 0;

    descargaIntervalo = setInterval(() => {
        if(progreso < 90){
            progreso += Math.random() * 12 + 3;
            if(progreso > 90) progreso = 90;
            barra.style.width = progreso + "%";
        }
    }, 120);

    const terminar = (exito, mensaje) => {
        stopLoadingSound();
        clearInterval(descargaIntervalo);
        descargaIntervalo = null;
        descargaController = null;
        barra.style.width = exito ? "100%" : (progreso + "%");
        estado.textContent = mensaje;
        setTimeout(() => cerrarDescarga(), exito ? 1800 : 3500);
    };

    if(!quickkey){
        terminar(false, "No se pudo procesar el enlace. Se abrirá en una pestaña.");
        setTimeout(() => window.open(link, "_blank"), 1500);
        return;
    }

    // Traer la página de MediaFire en segundo plano (vía proxies CORS)
    // y extraer la URL directa del botón "Descargar".
    obtenerUrlDirecta(link, descargaController.signal)
        .then(directa => {
            iniciarDescarga(directa);
            terminar(true, "Descarga iniciada ✔");
        })
        .catch(error => {
            if(error && error.name === "AbortError"){
                cerrarDescarga();
                return;
            }
            terminar(false, "No se pudo iniciar la descarga. Se abrirá en una pestaña.");
            setTimeout(() => window.open(link, "_blank"), 1500);
        });
}

async function obtenerUrlDirecta(link, signal){
    const proxies = [
        { base: "https://api.allorigins.win/raw?url=", json: false },
        { base: "https://api.allorigins.win/get?url=", json: true }
    ];

    let ultimoError = null;

    for(const p of proxies){
        try{
            const respuesta = await fetch(p.base + encodeURIComponent(link), { signal });

            if(!respuesta.ok) throw new Error("HTTP " + respuesta.status);

            let html;

            if(p.json){
                const datos = await respuesta.json();
                html = datos && datos.contents;
            }else{
                html = await respuesta.text();
            }

            const match = (html || "").match(/https:\/\/download\d+\.mediafire\.com\/[^"'\s]+/);

            if(!match) throw new Error("Sin URL directa");

            return match[0].replace(/&amp;/g, "&");
        }catch(error){
            if(error && error.name === "AbortError") throw error;
            ultimoError = error;
        }
    }

    throw ultimoError || new Error("Sin proxy disponible");
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

    if(descargaController) descargaController.abort();
    descargaController = null;
    if(descargaIntervalo) clearInterval(descargaIntervalo);
    descargaIntervalo = null;

    const box = document.getElementById("descargaBox");
    if(box) box.style.display = "none";
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
                    <button class="btn blue" onclick="playClick();abrirLink('${j.link1}')">
                        Ver enlace
                    </button>

                    <button class="btn green" onclick="playClick();abrirLink('${j.link2}')">
                        Ver enlace
                    </button>
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
