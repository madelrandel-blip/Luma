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

/* ========= LOGIN ESTADO ========= */
onAuthStateChanged(auth, (user) => {
    admin = !!user;

    if(adminPanel){
        adminPanel.style.display = admin ? "block" : "none";
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
            user.value,
            pass.value
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

        render(juegosData);

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
                <img src="${e.img}">
                <div class="content">
                    <h3>${e.nombre}</h3>
                    <p>${e.desc}</p>

                    <div class="btns" style="opacity:1; transform:none;">
                        <button class="btn blue" onclick="playClick();abrirLink('${e.link1}')">
                            Descargar
                        </button>

                        <button class="btn green" onclick="playClick();abrirLink('${e.link2}')">
                            Tutorial
                        </button>
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
                <img src="${r.img || ''}">
                <div class="content">
                    <h3>${r.nombre || 'Sin nombre'}</h3>
                    <p>${r.desc || 'Sin descripción'}</p>

                    <div class="btns" style="opacity:1; transform:none;">
                        <button class="btn blue" onclick="playClick();abrirLink('${r.link1 || ''}')">
                            Descargar
                        </button>

                        <button class="btn green" onclick="playClick();abrirLink('${r.link2 || ''}')">
                            Tutorial
                        </button>
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

/* ========= AGREGAR / EDITAR ========= */
window.agregarJuego = async function(){
    if(guardando) return;

    guardando = true;

    btnGuardar.disabled = true;

    const nuevo = {
        nombre: nombre.value,
        img: img.value,
        desc: desc.value,
        link1: link1.value,
        link2: link2.value
    };

    try{
        const q = query(
            collection(db, "juegos"),
            where("nombre", "==", nombre.value)
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
            await updateDoc(
                doc(db, "juegos", editIndex),
                nuevo
            );

            editIndex = null;
        }

    }catch(error){
        console.error("Error guardando:", error);
    }

    btnGuardar.innerText = "Guardar juego";
    btnGuardar.classList.remove("editando");

    guardando = false;
    btnGuardar.disabled = false;

    cargar();
};

/* ========= ELIMINAR ========= */
window.eliminar = async (id) => {
    try{
        await deleteDoc(doc(db, "juegos", id));

        cargar();

    }catch(error){
        console.error("Error eliminando:", error);
    }
};