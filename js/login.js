import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ==========================================
//  LÓGICA INMEDIATA DEL SPLASH SCREEN
// ==========================================
(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) {
        setTimeout(() => {
            splash.classList.add('oculto'); // Aplica la transición opacidad/visibilidad
            
            // Opcional: Remueve completamente el nodo del DOM tras la animación 
            // para que no interfiera con los clics del formulario inferior
            setTimeout(() => {
                splash.style.display = 'none';
            }, 600); // 600ms coincide con la transición CSS
        }, 2500); // Muestra la pantalla por 2.5 segundos
    }
})();

// ==========================================
//  EVENTOS INTERACTIVOS Y AUTENTICACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {

    const formLogin = document.getElementById('form-login') || document.querySelector('.card-form');
    const btnIniciar = document.getElementById('btn-iniciar') || formLogin.querySelector('.btn-primary');

    const passwordInput = document.getElementById('login-password');
    const togglePasswordBtn = document.getElementById('toggle-password');

    // Toggle para mostrar/ocultar contraseña
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', function () {
            const isPassword = passwordInput.getAttribute('type') === 'password';
            passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
            
            // Cambiar los íconos de Boxicons de forma fluida
            this.classList.toggle('bx-hide');
            this.classList.toggle('bx-show');
        });
    }

    if (!formLogin) {
        console.error("No se encontró el formulario de Login en el HTML.");
        return;
    }

    // SUBMIT (FIREBASE)
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evitar que la página se recargue

        // Extraer los valores de los inputs de tu diseño
        const correo = formLogin.querySelector('input[type="email"]').value.trim();
        const contrasena = passwordInput ? passwordInput.value : formLogin.querySelector('input[type="password"]').value;

        // Deshabilitar el botón para evitar múltiples clics
        btnIniciar.disabled = true;
        btnIniciar.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Verificando...";

        try {
            // Conectar con Firebase Authentication
            const userCredential = await signInWithEmailAndPassword(auth, correo, contrasena);
            const user = userCredential.user;

            // CONTROL DE ROLES POR CORREO
            if (user.email === 'admin1@gmail.com' || user.email.endsWith('@admin.com')) {
                window.location.href = 'admin/index.html'; // Interfaz de Panel de Administración
            } else {
                // Si es un ciudadano común, va al menú principal móvil
                window.location.href = 'menu.html'; 
            }

        } catch (error) {
            console.error("Error en Firebase Auth:", error.code);
            
            // Manejador de errores amigable para el usuario
            switch (error.code) {
                case 'auth/invalid-credential':
                case 'auth/wrong-password':
                case 'auth/user-not-found':
                    alert("⚠️ El correo electrónico o la contraseña son incorrectos.");
                    break;
                case 'auth/too-many-requests':
                    alert("⚠️ Demasiados intentos fallidos. Cuenta bloqueada temporalmente.");
                    break;
                default:
                    alert("❌ Error al conectar con el servidor. Inténtalo más tarde.");
                    break;
            }
        } finally {
            // Restaurar el botón a su estado original si ocurre un error
            btnIniciar.disabled = false;
            btnIniciar.innerHTML = "<i class='bx bx-bolt'></i> Iniciar sesión";
        }
    });
});