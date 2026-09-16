import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getFirestore,
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    updateDoc,
    setDoc,
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
const elEsHomebrew = document.getElementById("esHomebrew");
const elUser       = document.getElementById("user");
const elPass       = document.getElementById("pass");

// Colección a la que pertenece el juego en edición (juegos | homebrew)
let coleccionEdicion = "juegos";

/* ========= LOGIN ESTADO ========= */
onAuthStateChanged(auth, (user) => {
    admin = !!user;

    if(adminPanel){
        adminPanel.classList.remove("open");
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

        if(admin){
            // El admin necesita ver el estado real de Firestore, pero si la
            // colección homebrew falla (reglas, vacía, etc.) se reutiliza el
            // JSON estático para que los ports ya publicados sigan visibles.
            homebrewData = [];

            let errorLeyendoHomebrew = false;

            try{
                const snapH = await getDocs(collection(db, "homebrew"));

                snapH.forEach(docSnap => {
                    const j = docSnap.data();
                    j.id = docSnap.id;
                    j.coleccion = "homebrew";

                    homebrewData.push(j);
                });
            }catch(error){
                console.error("Error leyendo colección homebrew:", error);
                errorLeyendoHomebrew = true;
            }

            if(homebrewData.length === 0){
                homebrewData = await cargarJsonEstatico("data/homebrew.json");
                homebrewData.forEach(h => { h.id = h.id || ("hb-" + h.nombre); });

                if(errorLeyendoHomebrew && typeof mostrarToast === "function"){
                    mostrarToast('<i class="fa-solid fa-triangle-exclamation" style="color:#f59e0b;"></i> No se pudo leer "homebrew" desde Firestore (revisa los permisos). Mostrando datos estáticos.');
                }
            }

        }else{
            homebrewData = await cargarJsonEstatico("data/homebrew.json");
        }

        paginaActual = 1;

        listaActual = [...juegosData];
        render(listaActual);

        if(admin){
            // Marcar colección en los juegos normales
            juegosData.forEach(j => { j.coleccion = "juegos"; });

            // La lista del panel muestra normales + homebrew
            listaGlobal = [...juegosData];

            homebrewData.forEach(h => {
                h.coleccion = "homebrew";
                listaGlobal.push(h);
            });

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

    const nombreLimpio = (elNombre.value || "").trim();

    if(!nombreLimpio){
        alert("El nombre del juego es obligatorio.");
        elNombre.focus();
        return;
    }

    guardando = true;
    btnGuardar.disabled = true;

    let screenshotsFinales = elScreenshots.value
        ? elScreenshots.value.split("\n").map(u => u.trim()).filter(Boolean)
        : [];

    if(editIndex && screenshotsFinales.length === 0 && screenshotsOriginales.length > 0){
        screenshotsFinales = screenshotsOriginales;
    }

    const nuevo = {
        nombre: nombreLimpio,
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

    // Colección de destino: siempre según el checkbox "¿Es Homebrew?",
    // tanto al crear un juego nuevo como al editar uno existente. Antes,
    // al editar, se ignoraba el checkbox y se usaba la colección original,
    // así que no había forma de mover un juego a/desde Homebrew.
    const destino = elEsHomebrew && elEsHomebrew.checked ? "homebrew" : "juegos";
    const esNuevaColeccion = editIndex != null && destino !== coleccionEdicion;

    console.log("[Luma] Guardando:", nuevo.nombre, "| destino:", destino, "| editIndex:", editIndex, "| screenshots:", screenshotsFinales);

    try{
        const q = query(
            collection(db, destino),
            where("nombre", "==", nombreLimpio)
        );

        const snap = await getDocs(q);

        const yaExiste = snap.docs.some(d => d.id !== editIndex);

        if(yaExiste && (editIndex == null || esNuevaColeccion)){
            alert(`Ya existe un juego llamado "${nombreLimpio}" en ${destino === "homebrew" ? "Homebrew" : "Juegos"}.`);
            guardando = false;
            btnGuardar.disabled = false;
            return;
        }

        if(editIndex == null){
            // Juego nuevo.
            await addDoc(collection(db, destino), nuevo);

        }else if(esNuevaColeccion){
            // El juego cambió de colección (p. ej. de Juegos a Homebrew):
            // se crea en la colección nueva y se borra de la anterior.
            await setDoc(doc(db, destino, editIndex), nuevo);
            await deleteDoc(doc(db, coleccionEdicion, editIndex)).catch(err => {
                console.error("No se pudo borrar el documento original tras mover el juego:", err);
            });

        }else{
            // Misma colección: se usa setDoc con merge en lugar de updateDoc
            // porque updateDoc falla si el documento no existe todavía en
            // Firestore (por ejemplo, cuando la lista de Homebrew se cargó
            // como respaldo desde data/homebrew.json con un id generado).
            await setDoc(doc(db, destino, editIndex), nuevo, { merge: true });
        }

        if(typeof mostrarToast === "function"){
            mostrarToast(`<i class="fa-solid fa-circle-check" style="color:#10b981;"></i> "${nombreLimpio}" guardado en ${destino === "homebrew" ? "Homebrew" : "Juegos"}`);
        }

        editIndex = null;
        coleccionEdicion = "juegos";
        cancelarEdicion();
        await cargar();

    }catch(error){
        console.error("Error guardando:", error);
        alert(
            "No se pudo guardar el juego" + (destino === "homebrew" ? " en Homebrew" : "") + ".\n\n" +
            "Detalle: " + error.message + "\n\n" +
            "Si el error menciona permisos (permission-denied), revisa que las reglas de seguridad de Firestore " +
            'permitan leer y escribir también la colección "homebrew", no solo "juegos".'
        );
        // No se limpia el formulario ni se recarga para no perder lo escrito.
    }

    guardando = false;
    btnGuardar.disabled = false;
};

/* ========= ELIMINAR ========= */
window.eliminar = async (id, coleccion = "juegos") => {
    try{
        await deleteDoc(doc(db, coleccion, id));

        if(typeof mostrarToast === "function"){
            mostrarToast('<i class="fa-solid fa-trash" style="color:#ef4444;"></i> Juego eliminado');
        }

        await cargar();
    }catch(error){
        console.error("Error eliminando:", error);
        alert("No se pudo eliminar el juego.\n\nDetalle: " + error.message);
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
    coleccionEdicion = juego.coleccion === "homebrew" ? "homebrew" : "juegos";

    if(elEsHomebrew){
        elEsHomebrew.checked = coleccionEdicion === "homebrew";
    }

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
    btnGuardar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Actualizar juego';
    btnGuardar.classList.add("editando");
    document.getElementById("adminMode").classList.add("editing");
    document.getElementById("adminModeText").innerText = "Editando: " + juego.nombre;
    document.getElementById("btnCancelar").style.display = "inline-block";
    elNombre.focus();
};

/* ========= CANCELAR EDICION ========= */
window.cancelarEdicion = function(){
    editIndex = null;
    coleccionEdicion = "juegos";
    if(elEsHomebrew) elEsHomebrew.checked = false;
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
    btnGuardar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar juego';
    btnGuardar.classList.remove("editando");
    document.getElementById("adminMode").classList.remove("editing");
    document.getElementById("adminModeText").innerText = "Nuevo juego";
    document.getElementById("btnCancelar").style.display = "none";
};

/* ========= LISTA DE JUEGOS EN PANEL ========= */
window.renderAdminList = function(lista){
    const container = document.getElementById("adminGameList");
    if(!container) return;

    const contador = document.getElementById("adminCount");
    if(contador) contador.textContent = lista.length;

    container.innerHTML = "";

    if(lista.length === 0){
        container.innerHTML = '<p class="admin-empty">No hay juegos que coincidan.</p>';
        return;
    }

    lista.forEach(j => {
        const item = document.createElement("div");
        item.className = "admin-game-item" + (j.coleccion === "homebrew" ? " is-homebrew" : "");
        const hb = j.coleccion === "homebrew";
        item.innerHTML = `
            <img src="${j.img || ''}" alt="" onerror="this.src='assets/icon.png'">
            <div class="admin-game-item-info">
                <span>${j.nombre}${hb ? ' <em class="hb-badge">Homebrew</em>' : ''}</span>
                <small>${j.genre || 'Sin género'} ${j.year ? '· ' + j.year : ''}</small>
            </div>
            <button class="btn-edit" title="Editar" onclick="event.stopPropagation(); editarPorId('${j.id}')"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-delete" title="Eliminar" onclick="event.stopPropagation(); confirmarEliminar('${j.id}','${(j.nombre||'').replace(/'/g,"\\'")}','${hb ? 'homebrew' : 'juegos'}')"><i class="fa-solid fa-trash"></i></button>
        `;
        container.appendChild(item);
    });
};

window.editarPorId = function(id){
    const juego = listaGlobal.find(j => j.id === id);
    if(juego) editarJuego(juego);
};

window.confirmarEliminar = function(id, nombre, coleccion = "juegos"){
    if(confirm('¿Eliminar "' + nombre + '"?')){
        eliminar(id, coleccion);
    }
};

window.filtrarAdmin = function(){
    const term = document.getElementById("adminSearch").value.toLowerCase();
    const filtrados = listaGlobal.filter(j => j.nombre.toLowerCase().includes(term));
    renderAdminList(filtrados);
};

let listaGlobal = [];