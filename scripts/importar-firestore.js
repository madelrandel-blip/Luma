/* =========================
   IMPORTAR JSON A FIRESTORE
   ========================= */
// Se ejecuta desde GitHub Actions o manualmente.
// Lee /data/juegos.json y lo sube completo a Firestore,
// creando o actualizando documentos con TODOS los campos.

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// La credencial puede venir de variable de entorno o de un archivo local
let credencial;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    credencial = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
    // Para ejecución local: coloca tu serviceAccountKey.json en la raíz
    const rutaLocal = path.join(__dirname, "..", "serviceAccountKey.json");
    if (fs.existsSync(rutaLocal)) {
        credencial = JSON.parse(fs.readFileSync(rutaLocal, "utf-8"));
    } else {
        console.error("No se encontró credencial. Define FIREBASE_SERVICE_ACCOUNT o coloca serviceAccountKey.json en la raíz del proyecto.");
        process.exit(1);
    }
}

admin.initializeApp({
    credential: admin.credential.cert(credencial)
});

const db = admin.firestore();

// Todos los campos que el formulario admin maneja
const CAMPOS_PERMITIDOS = [
    "nombre", "img", "desc", "link1", "link2",
    "previewDesc", "trailer", "screenshots",
    "genre", "developer", "mode", "year", "rating",
    "gameId", "size", "format", "languages", "firmware", "update"
];

async function importarJuegos(coleccionNombre, rutaJson) {
    // Leer el JSON actualizado
    const ruta = path.join(__dirname, "..", rutaJson);
    const juegos = JSON.parse(fs.readFileSync(ruta, "utf-8"));

    console.log(`Leyendo ${juegos.length} juegos desde ${rutaJson}...`);

    // Obtener todos los documentos existentes en Firestore (para matchear por nombre)
    const snapshot = await db.collection(coleccionNombre).get();
    const existentes = {};
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        existentes[data.nombre] = docSnap.id;
    });

    let creados = 0;
    let actualizados = 0;
    let sinCambios = 0;

    for (const juego of juegos) {
        // Construir objeto solo con campos permitidos
        const datos = {};
        for (const campo of CAMPOS_PERMITIDOS) {
            if (juego[campo] !== undefined && juego[campo] !== null && juego[campo] !== "") {
                datos[campo] = juego[campo];
            }
        }

        // Asegurar que screenshots sea array
        if (!Array.isArray(datos.screenshots)) {
            datos.screenshots = [];
        }

        const nombre = datos.nombre;
        if (!nombre) continue;

        if (existentes[nombre]) {
            // Ya existe → actualizar
            const docRef = db.collection(coleccionNombre).doc(existentes[nombre]);
            const docSnap = await docRef.get();
            const actual = docSnap.data();

            // Verificar si hay cambios reales
            const cambio = CAMPOS_PERMITIDOS.some(campo => {
                const nuevo = JSON.stringify(datos[campo] || null);
                const viejo = JSON.stringify(actual[campo] || null);
                return nuevo !== viejo;
            });

            if (cambio) {
                await docRef.update(datos);
                console.log(`  ↻ Actualizado: ${nombre}`);
                actualizados++;
            } else {
                sinCambios++;
            }
        } else {
            // Nuevo → crear
            await db.collection(coleccionNombre).add(datos);
            console.log(`  + Creado: ${nombre}`);
            creados++;
        }
    }

    console.log(`\n--- Importación completada [${coleccionNombre}] ---`);
    console.log(`  Creados:     ${creados}`);
    console.log(`  Actualizados: ${actualizados}`);
    console.log(`  Sin cambios:  ${sinCambios}`);
    console.log(`  Total en JSON: ${juegos.length}`);
}

importarJuegos("juegos", "data/juegos.json")
    .then(() => importarJuegos("homebrew", "data/homebrew.json"))
    .catch(error => {
        console.error("Error importando a Firestore:", error);
        process.exit(1);
    });
