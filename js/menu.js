import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const txtDisplayName = document.getElementById('user-display-name');
const menuProfilePreview = document.getElementById('menu-profile-preview');

// 1. PROTEGER LA RUTA Y CONECTAR DATOS
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("Usuario activo:", user.email);
        
        try {
            // Referencia al documento espejo en Firestore
            const userDocRef = doc(db, "usuarios", user.uid);
            const docSnap = await getDoc(userDocRef);

            if (docSnap.exists()) {
                const userData = docSnap.data();
                
                // Mapeo exacto de nombres basado en tu estructura de Firestore
                const nombreUsuario = userData.nombre || userData.nombre_completo || "Ciudadano";
                txtDisplayName.innerText = nombreUsuario;

                // Si el usuario guardó una foto de perfil personalizada, la mostramos;
                // de lo contrario, se queda el logo institucional (logo3.png) puesto por defecto en el HTML.
                if (userData.fotoUrl && userData.fotoUrl.trim() !== "") {
                    menuProfilePreview.src = userData.fotoUrl;
                }
            } else {
                // Si el documento de Firestore no existe aún
                txtDisplayName.innerText = "Ciudadano";
            }
        } catch (error) {
            console.error("Error al recuperar los datos del usuario:", error);
            txtDisplayName.innerText = "Ciudadano";
        }

    } else {
        // Si no hay usuario, redirigimos al login inmediatamente
        window.location.href = 'login.html';
    }
});

// 2. LÓGICA DEL BOTÓN CERRAR SESIÓN
const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        if (confirm("¿Estás seguro de que deseas cerrar sesión?")) {
            try {
                await signOut(auth);
                window.location.href = 'login.html';
            } catch (error) {
                console.error("Error al cerrar sesión:", error);
                alert("No se pudo cerrar la sesión. Inténtalo de nuevo.");
            }
        }
    });
}