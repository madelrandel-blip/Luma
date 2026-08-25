import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getFirestore,
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    updateDoc,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* ========= CONFIG ========= */
const firebaseConfig = {
    apiKey: "AIzaSyCnqFKUPqbcTt0As9atnSQML00ReFgcgbw",
    authDomain: "luma-switch.firebaseapp.com",
    projectId: "luma-switch",
};

/* ========= INICIALIZAR ========= */
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/* ========= REFERENCIAS EXPLÍCITAS ========= */
const elNombre     = document.getElementById("nombre");
const elImg        = document.getElementById("img");
const elDesc       = document.getElementById("desc");
const elLink1      = document.getElementById("link1");
const elLink2      = document.getElementById("link2");
const elPreviewDesc= document.getElementById("previewDesc");
const elTrailer    = document.getElementById("trailer");
const elScreenshots= document.getElementById("screenshots");
const elGenre      = document.getElementById("genre");
const elDeveloper  = document.getElementById("developer");
const elMode       = document.getElementById("mode");
const elYear       = document.getElementById("year");
const elRating     = document.getElementById("rating");
const elGameId     = document.getElementById("gameId");
const elSize       = document.getElementById("size");
const elFormat     = document.getElementById("format");
const elLanguages  = document.getElementById("languages");
const elFirmware   = document.getElementById("firmware");
const elUpdate     = document.getElementById("update");
const elUser       = document.getElementById("user");
const elPass       = document.getElementById("pass");

/* ========= LOGIN ESTADO ========= */
onAuthStateChanged(auth, (user) => {
    admin = !!user;

    if(adminPanel){
        adminPanel.style.display = "none";
    }

    if(panelToggleBtn){
        panelToggleBtn.style.display = admin ? "inline-block" : "none";
    }

    if(logoutBtn){
        logoutBtn.style.display = admin ? "inline-block" : "none";
    }

    cargar();
});

/* ========= LOGIN ========= */
window.login = async () => {
    try{
        await signInWithEmailAndPassword(
            auth,
            elUser.value,
            elPass.value
        );

        cerrarLogin();

    }catch(error){
        alert("Error de acceso: " + error.message);
    }
};

/* ========= LOGOUT ========= */
window.logout = async () => {
    await signOut(auth);
};

/* ========= LEER JSON ESTATICO ========= */
// Lee un archivo JSON exportado del repositorio (ver /data).
// Esto evita gastar lecturas de Firestore en cada visita al sitio.
// Si el archivo no existe todavía o falla la descarga, devuelve un
// arreglo vacío para que quien llama decida el respaldo.
async function cargarJsonEstatico(ruta){
    try{
        const respuesta = await fetch(ruta, { cache: "no-store" });

        if(!respuesta.ok) return [];

        const datos = await respuesta.json();

        return Array.isArray(datos) ? datos : [];

    }catch(error){
        console.error(`Error leyendo ${ruta}:`, error);

        return [];
    }
}

/* ========= CARGAR JUEGOS ========= */
window.cargar = async () => {
    if(cargando) return;

    cargando = true;

    try{
        if(admin){
            // El admin necesita ver el estado real y actual de
            // Firestore para poder editar y eliminar con confianza.
            const snapshot = await getDocs(collection(db, "juegos"));

            juegosData = [];

            snapshot.forEach(docSnap => {
                const j = docSnap.data();

                j.id = docSnap.id;

                juegosData.push(j);
            });

        }else{
            // Los visitantes normales leen el JSON estático generado
            // por GitHub Actions, así no consumen lecturas de Firestore.
            juegosData = await cargarJsonEstatico("data/juegos.json");

            // Respaldo: si el JSON todavía no se generó (primer
            // despliegue), se consulta Firestore directamente.
            if(juegosData.length === 0){
                const snapshot = await getDocs(collection(db, "juegos"));

                juegosData = [];

                snapshot.forEach(docSnap => {
                    const j = docSnap.data();

                    j.id = docSnap.id;

                    juegosData.push(j);
                });
            }
        }

        juegosData.sort((a, b) =>
            a.nombre.localeCompare(
                b.nombre,
                "es",
                { sensitivity: "base" }
            )
        );

        paginaActual = 1;

        listaActual = [...juegosData];
        render(listaActual);

        if(admin){
            listaGlobal = [...juegosData];
            renderAdminList(listaGlobal);
        }

    }catch(error){
        console.error("Error cargando juegos:", error);
    }

    cargando = false;
};

/* ========= CARGAR EMULADORES ========= */
window.cargarEmuladores = async () => {
    const emuladoresStore = document.getElementById("emuladoresStore");

    if(!emuladoresStore) return;

    emuladoresStore.innerHTML = "<p style='text-align:center;'>Cargando...</p>";

    try{
        // No hay panel admin para emuladores, así que siempre se lee
        // el JSON estático y solo se recurre a Firestore como respaldo.
        let lista = await cargarJsonEstatico("data/emuladores.json");

        if(lista.length === 0){
            const snapshot = await getDocs(collection(db, "emuladores"));

            lista = [];

            snapshot.forEach(docSnap => lista.push(docSnap.data()));
        }

        let html = "";

        lista.forEach(e => {
            html += `
            <div class="card">
                <img src="${e.img}" loading="lazy" decoding="async" alt="${e.nombre}">
                <div class="content">
                    <div class="info-overlay">
                        <h3>${e.nombre}</h3>
                        <p>${e.desc}</p>
                    </div>

                    <div class="btns" style="opacity:1; transform:none;">
                        ${e.link1 ? `<button class="btn blue" onclick="playClick();abrirLink('${escapeComillas(e.link1)}')">Descargar</button>` : ''}
                        ${e.link2 ? `<button class="btn green" onclick="playClick();abrirLink('${escapeComillas(e.link2)}')">Tutorial</button>` : ''}
                    </div>
                </div>
            </div>`;
        });

        emuladoresStore.innerHTML =
            html || "<p style='text-align:center;'>No hay emuladores disponibles.</p>";

    }catch(error){
        console.error("Error cargando emuladores:", error);

        emuladoresStore.innerHTML =
            "<p style='text-align:center;'>Error al cargar emuladores.</p>";
    }
};

/* ========= CARGAR RECURSOS ========= */
window.cargarRecursos = async () => {
    const recursosStore = document.getElementById("recursosStore");

    if(!recursosStore) return;

    recursosStore.innerHTML = "<p style='text-align:center;'>Cargando...</p>";

    try{
        // No hay panel admin para recursos, así que siempre se lee
        // el JSON estático y solo se recurre a Firestore como respaldo.
        let lista = await cargarJsonEstatico("data/recursos.json");

        if(lista.length === 0){
            const snapshot = await getDocs(collection(db, "recursos"));

            lista = [];

            snapshot.forEach(docSnap => lista.push(docSnap.data()));
        }

        let html = "";

        lista.forEach(r => {
            html += `
            <div class="card">
                <img src="${r.img || ''}" loading="lazy" decoding="async" alt="${r.nombre || 'Sin nombre'}">
                <div class="content">
                    <div class="info-overlay">
                        <h3>${r.nombre || 'Sin nombre'}</h3>
                        <p>${r.desc || 'Sin descripción'}</p>
                    </div>

                    <div class="btns" style="opacity:1; transform:none;">
                        ${r.link1 ? `<button class="btn blue" onclick="playClick();abrirLink('${escapeComillas(r.link1)}')">Descargar</button>` : ''}
                        ${r.link2 ? `<button class="btn green" onclick="playClick();abrirLink('${escapeComillas(r.link2)}')">Tutorial</button>` : ''}
                    </div>
                </div>
            </div>`;
        });

        recursosStore.innerHTML =
            html || "<p style='text-align:center;'>No hay recursos disponibles.</p>";

    }catch(error){
        console.error("Error cargando recursos:", error);

        recursosStore.innerHTML =
            "<p style='text-align:center;'>Error al cargar recursos.</p>";
    }
};

let screenshotsOriginales = [];

/* ========= AGREGAR / EDITAR ========= */
window.agregarJuego = async function(){
    if(guardando) return;

    guardando = true;
    btnGuardar.disabled = true;

    let screenshotsFinales = elScreenshots.value
        ? elScreenshots.value.split("\n").map(u => u.trim()).filter(Boolean)
        : [];

    if(editIndex && screenshotsFinales.length === 0 && screenshotsOriginales.length > 0){
        screenshotsFinales = screenshotsOriginales;
    }

    const nuevo = {
        nombre: elNombre.value,
        img: elImg.value,
        desc: elDesc.value,
        link1: elLink1.value,
        link2: elLink2.value,
        previewDesc: elPreviewDesc.value || "",
        trailer: elTrailer.value || "",
        screenshots: screenshotsFinales,
        genre: elGenre.value || "",
        developer: elDeveloper.value || "",
        mode: elMode.value || "",
        year: elYear.value || "",
        rating: elRating.value || "",
        gameId: elGameId.value || "",
        size: elSize.value || "",
        format: elFormat.value || "",
        languages: elLanguages.value || "",
        firmware: elFirmware.value || "",
        update: elUpdate.value || ""
    };

    console.log("[Luma] Guardando:", nuevo.nombre, "| editIndex:", editIndex, "| screenshots:", screenshotsFinales);

    try{
        const q = query(
            collection(db, "juegos"),
            where("nombre", "==", elNombre.value)
        );

        const snap = await getDocs(q);

        if(!snap.empty && editIndex == null){
            alert("Este juego ya existe");
            guardando = false;
            btnGuardar.disabled = false;
            return;
        }

        if(editIndex == null){
            await addDoc(collection(db, "juegos"), nuevo);
        }else{
            await updateDoc(doc(db, "juegos", editIndex), nuevo);
            editIndex = null;
        }

    }catch(error){
        console.error("Error guardando:", error);
    }

    cancelarEdicion();
    await cargar();
    guardando = false;
    btnGuardar.disabled = false;
};

/* ========= ELIMINAR ========= */
window.eliminar = async (id) => {
    try{
        await deleteDoc(doc(db, "juegos", id));
        await cargar();
    }catch(error){
        console.error("Error eliminando:", error);
    }
};

/* ========= EDITAR: cargar datos al formulario ========= */
window.editarJuego = function(juego){
    if(editIndex && editIndex !== juego.id){
        if(!confirm("Tienes cambios sin guardar. ¿Descartarlos y editar " + juego.nombre + "?")){
            return;
        }
    }
    editIndex = juego.id;

    let ss = [];
    if(Array.isArray(juego.screenshots)){
        ss = juego.screenshots;
    }else if(typeof juego.screenshots === "string" && juego.screenshots.trim()){
        try{
            const parsed = JSON.parse(juego.screenshots);
            ss = Array.isArray(parsed) ? parsed : [juego.screenshots.trim()];
        }catch(e){
            ss = juego.screenshots.split("\n").map(u => u.trim()).filter(Boolean);
        }
    }
    screenshotsOriginales = [...ss];
    elScreenshots.value = ss.join("\n");

    elNombre.value = juego.nombre || "";
    elImg.value = juego.img || "";
    elDesc.value = juego.desc || "";
    elLink1.value = juego.link1 || "";
    elLink2.value = juego.link2 || "";
    elPreviewDesc.value = juego.previewDesc || "";
    elTrailer.value = juego.trailer || "";
    elGenre.value = juego.genre || "";
    elDeveloper.value = juego.developer || "";
    elMode.value = juego.mode || "";
    elYear.value = juego.year || "";
    elRating.value = juego.rating || "";
    elGameId.value = juego.gameId || "";
    elSize.value = juego.size || "";
    elFormat.value = juego.format || "";
    elLanguages.value = juego.languages || "";
    elFirmware.value = juego.firmware || "";
    elUpdate.value = juego.update || "";
    btnGuardar.innerText = "Actualizar juego";
    btnGuardar.classList.add("editando");
    document.getElementById("adminMode").classList.add("editing");
    document.getElementById("adminModeText").innerText = "Editando: " + juego.nombre;
    document.getElementById("btnCancelar").style.display = "inline-block";
    elNombre.focus();
};

/* ========= CANCELAR EDICION ========= */
window.cancelarEdicion = function(){
    editIndex = null;
    screenshotsOriginales = [];
    elNombre.value = "";
    elImg.value = "";
    elDesc.value = "";
    elLink1.value = "";
    elLink2.value = "";
    elPreviewDesc.value = "";
    elTrailer.value = "";
    elScreenshots.value = "";
    elGenre.value = "";
    elDeveloper.value = "";
    elMode.value = "";
    elYear.value = "";
    elRating.value = "";
    elGameId.value = "";
    elSize.value = "";
    elFormat.value = "";
    elLanguages.value = "";
    elFirmware.value = "";
    elUpdate.value = "";
    btnGuardar.innerText = "Guardar juego";
    btnGuardar.classList.remove("editando");
    document.getElementById("adminMode").classList.remove("editing");
    document.getElementById("adminModeText").innerText = "Nuevo juego";
    document.getElementById("btnCancelar").style.display = "none";
};

/* ========= LISTA DE JUEGOS EN PANEL ========= */
window.renderAdminList = function(lista){
    const container = document.getElementById("adminGameList");
    if(!container) return;
    container.innerHTML = "";
    lista.forEach(j => {
        const item = document.createElement("div");
        item.className = "admin-game-item";
        item.innerHTML = `
            <img src="${j.img || ''}" alt="" onerror="this.src='assets/icon.png'">
            <div class="admin-game-item-info">
                <span>${j.nombre}</span>
                <small>${j.genre || 'Sin género'} ${j.year ? '· ' + j.year : ''}</small>
            </div>
            <button class="btn-edit" title="Editar" onclick="event.stopPropagation(); editarPorId('${j.id}')">✎</button>
            <button class="btn-delete" title="Eliminar" onclick="event.stopPropagation(); confirmarEliminar('${j.id}','${(j.nombre||'').replace(/'/g,"\\'")}')">✕</button>
        `;
        container.appendChild(item);
    });
};

window.editarPorId = function(id){
    const juego = listaGlobal.find(j => j.id === id);
    if(juego) editarJuego(juego);
};

window.confirmarEliminar = function(id, nombre){
    if(confirm('¿Eliminar "' + nombre + '"?')){
        eliminar(id);
    }
};

window.filtrarAdmin = function(){
    const term = document.getElementById("adminSearch").value.toLowerCase();
    const filtrados = listaGlobal.filter(j => j.nombre.toLowerCase().includes(term));
    renderAdminList(filtrados);
};

let listaGlobal = [];