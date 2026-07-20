/* =========================
   EXPORTAR FIRESTORE A JSON
   ========================= */
// Se ejecuta desde GitHub Actions (nunca en el navegador).
// Lee las colecciones de Firestore y las guarda como archivos JSON
// estáticos en /data para que el sitio público los consuma sin
// gastar el límite de lecturas de Firestore en cada visita.

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// La credencial llega como variable de entorno (secret de GitHub
// Actions) y nunca se guarda en el repositorio.
const credencial = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(credencial)
});

const db = admin.firestore();

// Colecciones a exportar y el archivo destino de cada una
const colecciones = {
    juegos: "../data/juegos.json",
    emuladores: "../data/emuladores.json",
    recursos: "../data/recursos.json"
};

async function exportarColeccion(nombre, destino){
    const snapshot = await db.collection(nombre).get();

    const datos = [];

    snapshot.forEach(docSnap => {
        const item = docSnap.data();

        item.id = docSnap.id;

        datos.push(item);
    });

    const rutaCompleta = path.join(__dirname, destino);

    fs.mkdirSync(path.dirname(rutaCompleta), { recursive: true });
    fs.writeFileSync(rutaCompleta, JSON.stringify(datos, null, 2), "utf-8");

    console.log(`Exportado "${nombre}": ${datos.length} documentos -> ${destino}`);
}

async function main(){
    for(const [nombre, destino] of Object.entries(colecciones)){
        await exportarColeccion(nombre, destino);
    }
}

main().catch(error => {
    console.error("Error exportando Firestore:", error);
    process.exit(1);
});
