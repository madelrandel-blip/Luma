/* =========================
   IMPORTAR JSON A FIRESTORE
   ========================= */
// Se ejecuta desde GitHub Actions o a mano. Sube data/juegos.json y
// data/homebrew.json a Firestore: crea los documentos nuevos y actualiza
// los que cambiaron (se identifican por nombre).

const fs = require("fs");
const path = require("path");
const { db, dataDir } = require("./firestore");

// Campos que maneja el formulario del panel de administración
const CAMPOS_PERMITIDOS = [
    "nombre", "img", "desc", "link1", "link2", "botones",
    "previewDesc", "trailer", "screenshots",
    "genre", "developer", "mode", "year", "rating",
    "gameId", "size", "format", "languages", "firmware", "update"
];

const vacio = (valor) => valor === undefined || valor === null || valor === "";

function limpiar(juego) {
    const datos = {};

    for (const campo of CAMPOS_PERMITIDOS) {
        if (!vacio(juego[campo])) datos[campo] = juego[campo];
    }

    if (!Array.isArray(datos.screenshots)) datos.screenshots = [];

    return datos;
}

const huboCambios = (nuevo, actual) =>
    CAMPOS_PERMITIDOS.some(campo => JSON.stringify(nuevo[campo] ?? null) !== JSON.stringify(actual[campo] ?? null));

async function importarColeccion(coleccion) {
    const juegos = JSON.parse(fs.readFileSync(path.join(dataDir, `${coleccion}.json`), "utf-8"));

    console.log(`Importando ${juegos.length} documentos a "${coleccion}"...`);

    // Un único listado de Firestore sirve para localizar y comparar cada documento
    const snapshot = await db.collection(coleccion).get();
    const existentes = new Map(snapshot.docs.map(d => [d.get("nombre"), d]));

    let creados = 0;
    let actualizados = 0;
    let sinCambios = 0;

    for (const juego of juegos) {
        const datos = limpiar(juego);

        if (!datos.nombre) continue;

        const existente = existentes.get(datos.nombre);

        if (!existente) {
            await db.collection(coleccion).add(datos);
            console.log(`  + Creado: ${datos.nombre}`);
            creados++;

        } else if (huboCambios(datos, existente.data())) {
            await existente.ref.update(datos);
            console.log(`  ↻ Actualizado: ${datos.nombre}`);
            actualizados++;

        } else {
            sinCambios++;
        }
    }

    console.log(`Importación de "${coleccion}" completada: ${creados} creados, ${actualizados} actualizados, ${sinCambios} sin cambios.\n`);
}

(async () => {
    await importarColeccion("juegos");
    await importarColeccion("homebrew");
})().catch(error => {
    console.error("Error importando a Firestore:", error);
    process.exit(1);
});
