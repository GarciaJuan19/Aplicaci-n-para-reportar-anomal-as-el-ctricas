
// Importar los módulos de Firebase 
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
// Claves de la consola de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAoIzxoN8nYfw9p9XPZCbT_wgUQ0cYunjE",
    authDomain: "fallocero-52d1d.firebaseapp.com",
    projectId: "fallocero-52d1d",
    storageBucket: "fallocero-52d1d.firebasestorage.app",
    messagingSenderId: "T931258010793",
    appId: "1:931258010793:web:ff2686911fb9edca4f6db8"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar la base de datos Firestore para usarla en tus otros archivos
export const db = getFirestore(app);
export const auth = getAuth(app);