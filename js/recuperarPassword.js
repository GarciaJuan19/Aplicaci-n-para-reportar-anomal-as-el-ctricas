
import { auth } from './firebase-config.js'; 
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const formularioRecuperar = document.getElementById('form-recuperar');
    const inputCorreo = document.getElementById('rec-correo');
    const btnRecuperar = document.getElementById('btn-recuperar');

    if (formularioRecuperar) {
        formularioRecuperar.addEventListener('submit', async (e) => {
            e.preventDefault();

            const correo = inputCorreo.value.trim();

            // Validación de campo vacío
            if (!correo) {
                mostrarAlerta('Por favor, ingresa tu correo electrónico.', 'error');
                return;
            }

            try {
                // Bloquear botón y activar estado de carga visual
                btnRecuperar.disabled = true;
                btnRecuperar.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> Enviando...`;

                // Método nativo de Firebase para enviar el correo de recuperación
                await sendPasswordResetEmail(auth, correo);

                console.log("Correo de restablecimiento enviado con éxito a:", correo);
                mostrarAlerta('¡Enlace enviado! Revisa tu bandeja de entrada o spam.', 'exito');

                formularioRecuperar.reset();

                // Redirigir al login después de 3 segundos para que regrese a la pantalla principal
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3500);

            } catch (error) {
                console.error("Error al enviar correo de recuperación:", error.code, error.message);
                
                // Reactivar botón en caso de error
                btnRecuperar.disabled = false;
                btnRecuperar.innerHTML = `Enviar Enlace`;

                // Manejo de errores comunes de Firebase
                switch (error.code) {
                    case 'auth/user-not-found':
                        mostrarAlerta('No existe ninguna cuenta registrada con este correo.', 'error');
                        break;
                    case 'auth/invalid-email':
                        mostrarAlerta('El formato del correo electrónico no es válido.', 'error');
                        break;
                    default:
                        mostrarAlerta('Ocurrió un error. Inténtalo de nuevo más tarde.', 'error');
                        break;
                }
            }
        });
    }

    // Alertas Flotantes Toast nativas para tu interfaz PWA
    function mostrarAlerta(mensaje, tipo) {
        const toast = document.createElement('div');
        toast.className = `toast-alerta ${tipo === 'error' ? 'toast-error' : 'toast-exito'}`;
        toast.innerHTML = `
            <i class='bx ${tipo === 'error' ? 'bx-error-circle' : 'bx-check-circle'}'></i>
            <span>${mensaje}</span>
        `;
        
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
            toast.style.transition = 'all 0.4s ease';
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }
});