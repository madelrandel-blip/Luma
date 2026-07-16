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

/* ========= CARGAR JUEGOS ========= */
window.cargar = async () => {
    if(cargando) return;

    cargando = true;

    try{
        const snapshot = await getDocs(collection(db, "juegos"));

        juegosData = [];

        snapshot.forEach(docSnap => {
            const j = docSnap.data();

            j.id = docSnap.id;

            juegosData.push(j);
        });

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
        const snapshot = await getDocs(collection(db, "emuladores"));

        let html = "";

        snapshot.forEach(docSnap => {
            const e = docSnap.data();

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
        const snapshot = await getDocs(collection(db, "recursos"));

        let html = "";

        snapshot.forEach(docSnap => {
            const r = docSnap.data();

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