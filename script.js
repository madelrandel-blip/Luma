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

if(bgMusic){
    bgMusic.volume = 0.05;

    window.addEventListener("load", () => {
        bgMusic.pause();
        bgMusic.currentTime = 0;
        bgMusic.muted = true;

        if(volumeSlider){
            volumeSlider.value = bgMusic.volume * 100;
        }

        if(musicBtn){
            musicBtn.innerHTML = "▶ Play";
        }
    });
}

if(volumeSlider){
    volumeSlider.addEventListener("input", () => {
        bgMusic.volume = volumeSlider.value / 100;

        if(bgMusic.volume > 0){
            bgMusic.muted = false;
        }
    });
}

function toggleMusic(){
    playClick();

    if(!bgMusic) return;

    if(bgMusic.paused){
        bgMusic.muted = false;

        bgMusic.play().then(() => {
            if(musicBtn) musicBtn.innerHTML = "⏸ Pausa";
        }).catch(error => {
            console.log("Autoplay bloqueado:", error);
        });

    }else{
        bgMusic.pause();

        if(musicBtn){
            musicBtn.innerHTML = "▶ Play";
        }
    }
}

/* ========= BIENVENIDA ========= */
function aceptarBienvenida(){
    const pantalla = document.getElementById("welcomeScreen");

    if(bgMusic){
        bgMusic.muted = false;

        bgMusic.play().then(() => {
            if(musicBtn) musicBtn.innerHTML = "⏸ Pausa";
        }).catch(error => {
            console.log("Reproducción bloqueada:", error);
        });
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
    buscador.addEventListener("input", () => {
        const texto = buscador.value.toLowerCase();

        paginaActual = 1;

        render(
            juegosData.filter(j =>
                j.nombre.toLowerCase().includes(texto) ||
                j.desc.toLowerCase().includes(texto)
            )
        );
    });
}

/* ========= LINKS ========= */
function abrirLink(link){
    if(link && link.trim() !== ""){
        window.open(link, "_blank");
    }else{
        alert("No hay enlace disponible");
    }
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
    let numStars = 80;

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

    function draw(){
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

        requestAnimationFrame(draw);
    }

    resize();
    initStars();
    draw();

    window.addEventListener("resize", () => {
        resize();
        initStars();
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
