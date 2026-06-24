
import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 1. PROTEGER LA RUTA
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Si hay usuario, puedes pintar dinámicamente su nombre si quieres
        console.log("Usuario activo:", user.email);
        
        // Si el usuario tiene displayName en Firebase lo usamos, si no, dejamos "Juan"
        if(user.displayName) {
            document.getElementById('user-display-name').innerText = user.displayName;
        }
    } else {
        // Si no hay usuario, redirigimos al login
        window.location.href = 'login.html';
    }
});

// 2. LÓGICA DEL BOTÓN CERRAR SESIÓN
const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        try {
            await signOut(auth);
            alert("Sesión cerrada correctamente.");
            window.location.href = 'login.html';
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            alert("No se pudo cerrar la sesión. Inténtalo de nuevo.");
        }
    });
}