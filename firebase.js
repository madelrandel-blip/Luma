/* =========================
   LUMA SWITCH - firebase.js
   Acceso a datos (Firestore + JSON estático), autenticación y panel de administración.
   Depende de las funciones y el estado globales definidos en script.js.
   ========================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getFirestore,
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
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

/* ========= CONFIGURACIÓN ========= */
// La clave de API de Firebase es pública por diseño; el acceso real
// se controla con las reglas de seguridad de Firestore.
const firebaseConfig = {
    apiKey: "AIzaSyCnqFKUPqbcTt0As9atnSQML00ReFgcgbw",
    authDomain: "luma-switch.firebaseapp.com",
    projectId: "luma-switch"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/* ========= ESTADO DEL PANEL ========= */
let cargando = false;
let guardando = false;
let editIndex = null;            // id del documento en edición (null = juego nuevo)
let coleccionEdicion = "juegos"; // colección de origen del documento en edición
let screenshotsOriginales = [];
let listaGlobal = [];            // juegos + homebrew mostrados en el panel

// Campos de texto del formulario; el id del elemento coincide con el campo del documento
const CAMPOS = [
    "nombre", "img", "desc", "previewDesc", "trailer",
    "genre", "developer", "mode", "year", "rating",
    "gameId", "size", "format", "languages", "firmware", "update"
];

const campos = Object.fromEntries(CAMPOS.map(id => [id, document.getElementById(id)]));
const elScreenshots = document.getElementById("screenshots");
const elEsHomebrew = document.getElementById("esHomebrew");
const btnGuardar = document.getElementById("btnGuardar");
const btnCancelar = document.getElementById("btnCancelar");
const adminMode = document.getElementById("adminMode");
const adminModeText = document.getElementById("adminModeText");

/* ========= EDITOR DE BOTONES ========= */
const listaBotones = document.getElementById("botonesLista");
const selectTipoNuevo = document.getElementById("botonTipoNuevo");

const opcionesTipo = (seleccionado) => Object.keys(TIPOS_BOTON)
    .map(tipo => `<option${tipo === seleccionado ? " selected" : ""}>${tipo}</option>`)
    .join("");

selectTipoNuevo.innerHTML = opcionesTipo("Obtener");

function agregarFilaBoton({ tipo = "Obtener", texto = "", url = "", color = "" } = {}){
    if(!TIPOS_BOTON[tipo]) tipo = "Otro";

    const fila = document.createElement("div");
    fila.className = "boton-fila";

    fila.innerHTML = `
        <i class="bf-icono ${iconoBoton(tipo)}"></i>
        <select class="bf-tipo" title="Tipo de botón">${opcionesTipo(tipo)}</select>
        <input type="text" class="bf-url" placeholder="URL del enlace">
        <input type="color" class="bf-color" title="Color del botón">
        <div class="bf-acciones">
            <button type="button" data-op="subir" title="Subir"><i class="fa-solid fa-chevron-up"></i></button>
            <button type="button" data-op="bajar" title="Bajar"><i class="fa-solid fa-chevron-down"></i></button>
            <button type="button" data-op="borrar" title="Quitar"><i class="fa-solid fa-trash"></i></button>
        </div>
        <div class="bf-paleta">${PALETA_BOTON.map(c => `<button type="button" data-color="${c}" title="${c}" style="background:${c}"></button>`).join("")}</div>
        <input type="text" class="bf-texto" placeholder="Texto del botón">`;

    const inputColor = fila.querySelector(".bf-color");

    fila.querySelector(".bf-url").value = url;
    fila.querySelector(".bf-texto").value = texto;

    // Si el color guardado es el predeterminado del tipo, seguirá al cambiar de tipo
    const personalizado = colorValido(color) && color.toLowerCase() !== TIPOS_BOTON[tipo].toLowerCase();
    fila.dataset.personalizado = personalizado ? "1" : "";

    inputColor.value = colorValido(color) ? color : TIPOS_BOTON[tipo];
    fila.style.setProperty("--c", inputColor.value);
    fila.classList.toggle("es-otro", tipo === "Otro");

    listaBotones.appendChild(fila);
}

function limpiarBotones(){
    listaBotones.innerHTML = "";
}

function leerBotones(){
    return [...listaBotones.children]
        .map(fila => {
            const tipo = fila.querySelector(".bf-tipo").value;
            const boton = {
                tipo,
                url: fila.querySelector(".bf-url").value.trim(),
                color: fila.querySelector(".bf-color").value
            };

            if(tipo === "Otro") boton.texto = fila.querySelector(".bf-texto").value.trim();

            return boton;
        })
        .filter(b => b.url);
}

document.getElementById("btnAgregarBoton").addEventListener("click", () => {
    agregarFilaBoton({ tipo: selectTipoNuevo.value });
});

listaBotones.addEventListener("change", (e) => {
    const fila = e.target.closest(".boton-fila");
    if(!fila) return;

    if(e.target.classList.contains("bf-tipo")){
        fila.classList.toggle("es-otro", e.target.value === "Otro");
        fila.querySelector(".bf-icono").className = "bf-icono " + iconoBoton(e.target.value);

        if(!fila.dataset.personalizado){
            const color = fila.querySelector(".bf-color");
            color.value = TIPOS_BOTON[e.target.value];
            fila.style.setProperty("--c", color.value);
        }
    }
});

listaBotones.addEventListener("input", (e) => {
    if(!e.target.classList.contains("bf-color")) return;

    const fila = e.target.closest(".boton-fila");
    fila.dataset.personalizado = "1";
    fila.style.setProperty("--c", e.target.value);
});

listaBotones.addEventListener("click", (e) => {
    const muestra = e.target.closest("button[data-color]");

    if(muestra){
        const fila = muestra.closest(".boton-fila");

        fila.querySelector(".bf-color").value = muestra.dataset.color;
        fila.dataset.personalizado = "1";
        fila.style.setProperty("--c", muestra.dataset.color);
        return;
    }

    const boton = e.target.closest("button[data-op]");
    if(!boton) return;

    const fila = boton.closest(".boton-fila");

    if(boton.dataset.op === "subir" && fila.previousElementSibling){
        fila.previousElementSibling.before(fila);
    }else if(boton.dataset.op === "bajar" && fila.nextElementSibling){
        fila.nextElementSibling.after(fila);
    }else if(boton.dataset.op === "borrar"){
        fila.remove();
    }
});

const etiquetaColeccion = (coleccion) => coleccion === "homebrew" ? "Homebrew" : "Juegos";

agregarFilaBoton();

/* ========= SESIÓN ========= */
onAuthStateChanged(auth, (user) => {
    admin = !!user;

    adminPanel.classList.remove("open");
    adminPanel.style.display = "none";

    panelToggleBtn.style.display = admin ? "inline-block" : "none";
    logoutBtn.style.display = admin ? "inline-block" : "none";

    cargar();
});

window.login = async () => {
    try{
        await signInWithEmailAndPassword(
            auth,
            document.getElementById("user").value,
            document.getElementById("pass").value
        );

        cerrarLogin();

    }catch(error){
        alert("No se pudo iniciar sesión: " + error.message);
    }
};

window.logout = () => signOut(auth);

/* ========= LECTURA DE DATOS ========= */
// Lee un JSON exportado al repositorio (ver /data). Así las visitas
// normales no consumen lecturas de Firestore. Devuelve [] si falla.
async function cargarJsonEstatico(ruta){
    try{
        const respuesta = await fetch(ruta, { cache: "no-store" });

        if(!respuesta.ok) return [];

        const datos = await respuesta.json();

        return Array.isArray(datos) ? datos : [];

    }catch(error){
        console.error(`No se pudo leer ${ruta}:`, error);

        return [];
    }
}

async function leerColeccion(nombre){
    const snapshot = await getDocs(collection(db, nombre));

    return snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
}

// JSON estático primero; Firestore solo si el archivo aún no existe o está vacío
async function leerConRespaldo(coleccion){
    const lista = await cargarJsonEstatico(`data/${coleccion}.json`);

    return lista.length > 0 ? lista : leerColeccion(coleccion);
}

const ordenarPorNombre = (lista) =>
    lista.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" }));

/* ========= CATÁLOGO PRINCIPAL ========= */
window.cargar = async () => {
    if(cargando) return;

    cargando = true;

    try{
        // El administrador siempre lee Firestore para editar sobre datos reales;
        // los visitantes usan el JSON estático.
        juegosData = admin ? await leerColeccion("juegos") : await leerConRespaldo("juegos");
        juegosData.forEach(j => { j.coleccion = "juegos"; });
        ordenarPorNombre(juegosData);

        homebrewData = admin ? await leerHomebrewAdmin() : await cargarJsonEstatico("data/homebrew.json");
        homebrewData.forEach(h => { h.coleccion = "homebrew"; });
        ordenarPorNombre(homebrewData);

        aplicarBusqueda();

        if(admin){
            listaGlobal = [...juegosData, ...homebrewData];
            renderAdminList(listaGlobal);
        }

    }catch(error){
        console.error("Error cargando el catálogo:", error);

    }finally{
        cargando = false;
    }
};

// Si la colección "homebrew" no se puede leer (reglas) o está vacía, se usa el
// JSON estático para que los ports ya publicados sigan visibles en el panel.
async function leerHomebrewAdmin(){
    let lista = [];
    let falloLectura = false;

    try{
        lista = await leerColeccion("homebrew");
    }catch(error){
        console.error("No se pudo leer la colección homebrew:", error);
        falloLectura = true;
    }

    if(lista.length > 0) return lista;

    lista = await cargarJsonEstatico("data/homebrew.json");
    lista.forEach(h => { h.id = h.id || ("hb-" + h.nombre); });

    if(falloLectura){
        mostrarToast('No se pudo leer "homebrew" desde Firestore (revisa los permisos). Se muestran los datos estáticos.', "aviso");
    }

    return lista;
}

/* ========= EMULADORES Y RECURSOS ========= */
// No tienen panel de administración: se leen del JSON estático y
// solo se consulta Firestore como respaldo.
async function cargarSeccion(coleccion, contenedorId, plural){
    const contenedor = document.getElementById(contenedorId);
    if(!contenedor) return;

    contenedor.innerHTML = "<p style='text-align:center;'>Cargando...</p>";

    try{
        const lista = await leerConRespaldo(coleccion);

        contenedor.innerHTML = lista.length
            ? lista.map(tarjetaSeccion).join("")
            : `<p style='text-align:center;'>No hay ${plural} disponibles.</p>`;

    }catch(error){
        console.error(`Error cargando ${plural}:`, error);

        contenedor.innerHTML = `<p style='text-align:center;'>No se pudieron cargar los ${plural}.</p>`;
    }
}

function tarjetaSeccion(item){
    const boton = (clase, texto, link) => link
        ? `<button class="btn ${clase}" data-link="${esc(link)}" data-nombre="${esc(item.nombre)}">${texto}</button>`
        : "";

    return `
        <div class="card">
            <img ${atributosImg(item.img, 360)} alt="${esc(item.nombre)}">
            <div class="content">
                <div class="info-overlay">
                    <h3>${esc(item.nombre || "Sin nombre")}</h3>
                    <p>${esc(item.desc || "Sin descripción")}</p>
                </div>

                <div class="btns" style="opacity:1; transform:none;">
                    ${boton("blue", "Descargar", item.link1)}
                    ${boton("green", "Tutorial", item.link2)}
                </div>
            </div>
        </div>`;
}

window.cargarEmuladores = () => cargarSeccion("emuladores", "emuladoresStore", "emuladores");
window.cargarRecursos = () => cargarSeccion("recursos", "recursosStore", "recursos");

/* ========= FORMULARIO: GUARDAR ========= */
function leerFormulario(){
    const datos = {};

    for(const id of CAMPOS){
        datos[id] = campos[id].value.trim();
    }

    datos.botones = leerBotones();

    // link1/link2 se mantienen por compatibilidad (carrito y datos antiguos)
    const principal = datos.botones.find(b => b.tipo === "Obtener") || datos.botones[0];
    const secundario = datos.botones.find(b => b !== principal);

    datos.link1 = principal ? principal.url : "";
    datos.link2 = secundario ? secundario.url : "";

    datos.screenshots = elScreenshots.value.split("\n").map(u => u.trim()).filter(Boolean);

    // Al editar, si se vació el campo, se conservan las capturas originales
    if(editIndex && datos.screenshots.length === 0){
        datos.screenshots = screenshotsOriginales;
    }

    return datos;
}

function bloquearGuardado(bloqueado){
    guardando = bloqueado;
    btnGuardar.disabled = bloqueado;
}

window.agregarJuego = async function(){
    if(guardando) return;

    const nuevo = leerFormulario();

    if(!nuevo.nombre){
        alert("El nombre del juego es obligatorio.");
        campos.nombre.focus();
        return;
    }

    bloquearGuardado(true);

    // La colección de destino la define siempre la casilla "¿Es Homebrew?",
    // tanto al crear como al editar (permite mover un juego entre secciones).
    const destino = elEsHomebrew.checked ? "homebrew" : "juegos";
    const cambiaColeccion = editIndex != null && destino !== coleccionEdicion;

    try{
        const coincidencias = await getDocs(query(collection(db, destino), where("nombre", "==", nuevo.nombre)));
        const duplicado = coincidencias.docs.some(d => d.id !== editIndex);

        if(duplicado && (editIndex == null || cambiaColeccion)){
            alert(`Ya existe un juego llamado "${nuevo.nombre}" en ${etiquetaColeccion(destino)}.`);
            return;
        }

        if(editIndex == null){
            await addDoc(collection(db, destino), nuevo);

        }else if(cambiaColeccion){
            // Se crea en la colección nueva y se elimina de la anterior
            await setDoc(doc(db, destino, editIndex), nuevo);
            await deleteDoc(doc(db, coleccionEdicion, editIndex)).catch(error => {
                console.error("No se pudo eliminar el documento original tras moverlo:", error);
            });

        }else{
            // setDoc con merge en lugar de updateDoc: este último falla si el documento
            // aún no existe en Firestore (p. ej. homebrew cargado desde el JSON de respaldo).
            await setDoc(doc(db, destino, editIndex), nuevo, { merge: true });
        }

        mostrarToast(`"${nuevo.nombre}" se guardó en ${etiquetaColeccion(destino)}.`);

        cancelarEdicion();
        await cargar();

    }catch(error){
        console.error("Error guardando:", error);

        // El formulario no se limpia para no perder lo escrito
        alert(
            "No se pudo guardar el juego.\n\n" +
            "Detalle: " + error.message + "\n\n" +
            'Si el error es de permisos (permission-denied), verifica que las reglas de Firestore ' +
            'permitan leer y escribir también la colección "homebrew".'
        );

    }finally{
        bloquearGuardado(false);
    }
};

/* ========= FORMULARIO: EDITAR Y CANCELAR ========= */
function normalizarScreenshots(valor){
    if(Array.isArray(valor)) return valor;
    if(typeof valor !== "string" || !valor.trim()) return [];

    try{
        const parsed = JSON.parse(valor);
        return Array.isArray(parsed) ? parsed : [valor.trim()];
    }catch(error){
        return valor.split("\n").map(u => u.trim()).filter(Boolean);
    }
}

function estadoFormulario({ modo, texto, boton, cancelarVisible }){
    adminMode.classList.toggle("editing", modo === "editando");
    adminModeText.textContent = texto;
    btnGuardar.innerHTML = boton;
    btnGuardar.classList.toggle("editando", modo === "editando");
    btnCancelar.style.display = cancelarVisible ? "inline-block" : "none";
}

window.editarJuego = function(juego){
    if(editIndex && editIndex !== juego.id){
        if(!confirm(`Hay una edición en curso. ¿Descartar los cambios y editar "${juego.nombre}"?`)) return;
    }

    editIndex = juego.id;
    coleccionEdicion = juego.coleccion === "homebrew" ? "homebrew" : "juegos";
    elEsHomebrew.checked = coleccionEdicion === "homebrew";

    screenshotsOriginales = normalizarScreenshots(juego.screenshots);
    elScreenshots.value = screenshotsOriginales.join("\n");

    for(const id of CAMPOS){
        campos[id].value = juego[id] || "";
    }

    limpiarBotones();
    obtenerBotones(juego).forEach(agregarFilaBoton);

    estadoFormulario({
        modo: "editando",
        texto: "Editando: " + juego.nombre,
        boton: '<i class="fa-solid fa-floppy-disk"></i> Actualizar juego',
        cancelarVisible: true
    });

    campos.nombre.focus();
};

window.cancelarEdicion = function(){
    editIndex = null;
    coleccionEdicion = "juegos";
    screenshotsOriginales = [];
    elEsHomebrew.checked = false;
    elScreenshots.value = "";

    for(const id of CAMPOS){
        campos[id].value = "";
    }

    limpiarBotones();
    agregarFilaBoton();

    estadoFormulario({
        modo: "nuevo",
        texto: "Nuevo juego",
        boton: '<i class="fa-solid fa-floppy-disk"></i> Guardar juego',
        cancelarVisible: false
    });
};

/* ========= ELIMINAR ========= */
window.eliminar = async (id, coleccion = "juegos") => {
    try{
        await deleteDoc(doc(db, coleccion, id));

        mostrarToast("Juego eliminado.", "eliminado");

        await cargar();

    }catch(error){
        console.error("Error eliminando:", error);
        alert("No se pudo eliminar el juego.\n\nDetalle: " + error.message);
    }
};

window.confirmarEliminar = function(id, nombre, coleccion = "juegos"){
    if(confirm(`¿Eliminar "${nombre}"?`)) eliminar(id, coleccion);
};

/* ========= LISTA DEL PANEL ========= */
window.renderAdminList = function(lista){
    const contenedor = document.getElementById("adminGameList");
    if(!contenedor) return;

    const contador = document.getElementById("adminCount");
    if(contador) contador.textContent = lista.length;

    if(lista.length === 0){
        contenedor.innerHTML = '<p class="admin-empty">No hay juegos que coincidan.</p>';
        return;
    }

    contenedor.innerHTML = lista.map(j => {
        const esHomebrew = j.coleccion === "homebrew";

        return `
        <div class="admin-game-item${esHomebrew ? " is-homebrew" : ""}">
            <img ${atributosImg(j.img, 100)} alt="">
            <div class="admin-game-item-info">
                <span>${esc(j.nombre)}${esHomebrew ? ' <em class="hb-badge">Homebrew</em>' : ""}</span>
                <small>${esc(j.genre || "Sin género")}${j.year ? " · " + esc(j.year) : ""}</small>
            </div>
            <button class="btn-edit" title="Editar" data-accion="editar" data-id="${esc(j.id)}"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-delete" title="Eliminar" data-accion="eliminar" data-id="${esc(j.id)}"><i class="fa-solid fa-trash"></i></button>
        </div>`;
    }).join("");
};

document.getElementById("adminGameList")?.addEventListener("click", (e) => {
    const boton = e.target.closest("button[data-accion]");
    if(!boton) return;

    const juego = listaGlobal.find(j => j.id === boton.dataset.id);
    if(!juego) return;

    if(boton.dataset.accion === "editar") editarJuego(juego);
    else confirmarEliminar(juego.id, juego.nombre, juego.coleccion);
});

window.filtrarAdmin = function(){
    const termino = document.getElementById("adminSearch").value.trim().toLowerCase();

    renderAdminList(listaGlobal.filter(j => (j.nombre || "").toLowerCase().includes(termino)));
};
