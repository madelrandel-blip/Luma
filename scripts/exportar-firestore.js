/* =========================
   EXPORTAR FIRESTORE A JSON
   ========================= */
// Se ejecuta desde GitHub Actions. Guarda las colecciones de Firestore como
// JSON estático en /data para que el sitio público no consuma lecturas de
// Firestore en cada visita.

const fs = require("fs");
const path = require("path");
const { db, dataDir } = require("./firestore");

const COLECCIONES = ["juegos", "homebrew", "emuladores", "recursos"];

async function exportarColeccion(nombre) {
    const snapshot = await db.collection(nombre).get();
    const datos = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));

    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(path.join(dataDir, `${nombre}.json`), JSON.stringify(datos, null, 2), "utf-8");

    console.log(`Exportado "${nombre}": ${datos.length} documentos`);
}

(async () => {
    for (const nombre of COLECCIONES) {
        await exportarColeccion(nombre);
    }
})().catch(error => {
    console.error("Error exportando Firestore:", error);
    process.exit(1);
});
