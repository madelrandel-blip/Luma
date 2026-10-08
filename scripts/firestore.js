/* Conexión compartida con Firestore para los scripts de sincronización. */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// La credencial llega por la variable FIREBASE_SERVICE_ACCOUNT (secret de GitHub
// Actions) o, en local, desde serviceAccountKey.json en la raíz del proyecto.
// Nunca se guarda en el repositorio.
function leerCredencial() {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    }

    const rutaLocal = path.join(__dirname, "..", "serviceAccountKey.json");

    if (!fs.existsSync(rutaLocal)) {
        console.error("No se encontró la credencial. Define FIREBASE_SERVICE_ACCOUNT o coloca serviceAccountKey.json en la raíz del proyecto.");
        process.exit(1);
    }

    return JSON.parse(fs.readFileSync(rutaLocal, "utf-8"));
}

admin.initializeApp({ credential: admin.credential.cert(leerCredencial()) });

module.exports = { db: admin.firestore(), dataDir: path.join(__dirname, "..", "data") };
