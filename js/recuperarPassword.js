import { auth } from './firebase-config.js'; 
import { 
    sendPasswordResetEmail, 
    fetchSignInMethodsForEmail  // 🆕 Para verificar si el correo existe
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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
                mostrarToast('Por favor, ingresa tu correo electrónico.', 'error');
                return;
            }

            // Validación de formato de email
            if (!correo.includes('@') || !correo.includes('.')) {
                mostrarToast('Por favor, ingresa un correo electrónico válido.', 'error');
                return;
            }

            try {
                // 🆕 Verificar si el correo existe en Firebase Auth
                const metodos = await fetchSignInMethodsForEmail(auth, correo);
                
                if (metodos.length === 0) {
                    mostrarToast('⚠️ No existe ninguna cuenta con este correo.', 'error');
                    return;
                }

                // Bloquear botón y activar estado de carga
                btnRecuperar.disabled = true;
                btnRecuperar.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> Enviando...`;

                // Método nativo de Firebase para enviar el correo
                await sendPasswordResetEmail(auth, correo, {
                    url: window.location.href.replace('recuperarPassword.html', 'login.html'),
                    handleCodeInApp: false
                });

                console.log("Correo enviado a:", correo);
                mostrarToast('✅ ¡Enlace enviado! Revisa tu bandeja de entrada o SPAM.', 'exito');

                formularioRecuperar.reset();

                // Redirigir al login después de 4 segundos
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 4000);

            } catch (error) {
                console.error("Error detallado:", error.code, error.message);
                
                // Reactivar botón en caso de error
                btnRecuperar.disabled = false;
                btnRecuperar.innerHTML = `Enviar Enlace`;

                // Manejo de errores detallado
                switch (error.code) {
                    case 'auth/user-not-found':
                        mostrarToast('⚠️ No existe ninguna cuenta con este correo.', 'error');
                        break;
                    case 'auth/invalid-email':
                        mostrarToast('⚠️ El formato del correo no es válido.', 'error');
                        break;
                    case 'auth/too-many-requests':
                        mostrarToast('⏱️ Demasiados intentos. Espera 5 minutos.', 'error');
                        break;
                    default:
                        mostrarToast('❌ Error: ' + error.message, 'error');
                        break;
                }
            }
        });
    }

    // --- TOASTS MEJORADOS ---
    function mostrarToast(mensaje, tipo) {
        const toastsExistentes = document.querySelectorAll('.toast-alerta');
        toastsExistentes.forEach(t => t.remove());

        const toast = document.createElement('div');
        toast.className = 'toast-alerta';
        toast.innerHTML = `
            <i class='bx ${tipo === 'error' ? 'bx-error-circle' : 'bx-check-circle'}'></i>
            <span>${mensaje}</span>
        `;
        
        const colorFondo = tipo === 'error' ? '#fef2f2' : '#f0fdf4';
        const colorTexto = tipo === 'error' ? '#dc2626' : '#16a34a';
        const colorBorde = tipo === 'error' ? '#fecaca' : '#bbf7d0';
        
        toast.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: ${colorFondo};
            color: ${colorTexto};
            padding: 14px 24px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            z-index: 99999;
            display: flex;
            align-items: center;
            gap: 10px;
            border: 1px solid ${colorBorde};
            max-width: 90%;
            font-family: system-ui, -apple-system, sans-serif;
            animation: slideUpToast 0.3s ease-out;
        `;
        
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
            toast.style.transition = 'all 0.4s ease';
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }

    // Estilos para toast
    const styleToast = document.createElement('style');
    styleToast.textContent = `
        @keyframes slideUpToast {
            from { opacity: 0; transform: translateX(-50%) translateY(30px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .toast-alerta {
            animation: slideUpToast 0.3s ease-out !important;
            font-family: system-ui, -apple-system, sans-serif;
        }
        .toast-alerta i {
            font-size: 20px;
        }
    `;
    document.head.appendChild(styleToast);
});