
import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const formularioRegistro = document.getElementById('form-registro');
    const inputNombre = document.getElementById('reg-nombre');
    const inputCorreo = document.getElementById('reg-correo');
    const inputPassword = document.getElementById('reg-password');
    const inputConfirmar = document.getElementById('reg-confirmar');
    const chkTerminos = document.getElementById('reg-terminos');
    const btnRegistrar = document.getElementById('btn-registrar');
    const btnVerPassword = document.getElementById('toggle-reg-password');

    //  (Icono del Ojo)
    if (btnVerPassword && inputPassword && inputConfirmar) {
        btnVerPassword.addEventListener('click', () => {
            const tipoActual = inputPassword.getAttribute('type') === 'password' ? 'text' : 'password';
            inputPassword.setAttribute('type', tipoActual);
            inputConfirmar.setAttribute('type', tipoActual);
            
            // Alternar el icono de Boxicons dinámicamente
            const icono = btnVerPassword.querySelector('i');
            if (icono) {
                if (tipoActual === 'text') {
                    icono.className = 'bx bx-hide';
                } else {
                    icono.className = 'bx bx-show';
                }
            }
        });
    }

    //  ENVÍO DEL FORMULARIO DE REGISTRO
    if (formularioRegistro) {
        formularioRegistro.addEventListener('submit', async (e) => {
            e.preventDefault(); // Detener la recarga nativa de la página

            // Capturar la información limpiando espacios vacíos en los extremos
            const nombre = inputNombre.value.trim();
            const correo = inputCorreo.value.trim();
            const password = inputPassword.value;
            const confirmar = inputConfirmar.value;

            // VALIDACIONES DE INTERFAZ 
            
            // A) Validación de campos vacíos
            if (!nombre || !correo || !password || !confirmar) {
                mostrarAlerta('Por favor, rellena todos los campos obligatorios.', 'error');
                return;
            }

            // B) Validación de aceptación legales de la PWA
            if (!chkTerminos.checked) {
                mostrarAlerta('Es necesario aceptar los términos y condiciones de uso.', 'error');
                return;
            }

            // C) Validación de concordancia de contraseñas
            if (password !== confirmar) {
                mostrarAlerta('Las contraseñas ingresadas no coinciden.', 'error');
                inputConfirmar.focus();
                return;
            }

            // D) Validación de fuerza de contraseña (Mínimo 8 caracteres, al menos 1 letra y 1 número)
            const regexPassword = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
            if (!regexPassword.test(password)) {
                mostrarAlerta('La contraseña debe tener un mínimo de 8 caracteres e incluir letras y números.', 'error');
                inputPassword.focus();
                return;
            }

            // --- PROCESO SEGURO DE REGISTRO CON FIREBASE ---
            try {
                // Bloquear el botón y mostrar estado visual de carga (Spinner de Boxicons)
                btnRegistrar.disabled = true;
                btnRegistrar.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> Creando cuenta...`;

                //dar de alta la credencial en Firebase Auth
                const credencialUsuario = await createUserWithEmailAndPassword(auth, correo, password);
                const usuario = credencialUsuario.user;
                console.log("Cuenta creada en Auth. UID asignado:", usuario.uid);

                // Crear el documento de perfil del usuario en Firestore vinculando su UID real
                await setDoc(doc(db, "usuarios", usuario.uid), {
                    id_usuario: usuario.uid,
                    nombre_completo: nombre,
                    correo_electronico: correo,
                    rol: "ciudadano", // Rol base por defecto del sistema
                    fecha_registro: new Date().toISOString()
                });

                console.log("Perfil del ciudadano guardado en Firestore de forma exitosa.");
                mostrarAlerta('¡Registro completado con éxito! Redirigiendo...', 'exito');

                // Limpiar los inputs del formulario por seguridad
                formularioRegistro.reset();

                // Esperar 2 segundos para dar tiempo de lectura al Toast y redirigir al login
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);

            } catch (error) {
                console.error("Error detectado en el proceso de registro:", error.code, error.message);
                
                // Restaurar el botón en caso de falla en el servidor
                btnRegistrar.disabled = false;
                btnRegistrar.innerHTML = `Registrar Cuenta`;

                // Clasificar el error devuelto por Firebase Auth para comunicarlo al ciudadano
                switch (error.code) {
                    case 'auth/email-already-in-use':
                        mostrarAlerta('Este correo electrónico ya se encuentra registrado.', 'error');
                        inputCorreo.focus();
                        break;
                    case 'auth/invalid-email':
                        mostrarAlerta('El formato del correo electrónico ingresado no es válido.', 'error');
                        inputCorreo.focus();
                        break;
                    case 'auth/weak-password':
                        mostrarAlerta('La contraseña proporcionada es demasiado débil para el servidor.', 'error');
                        inputPassword.focus();
                        break;
                    default:
                        mostrarAlerta('No se pudo completar el registro. Inténtalo de nuevo más tarde.', 'error');
                        break;
                }
            }
        });
    }

    // GENERADOR DE ALERTAS 
    function mostrarAlerta(mensaje, tipo) {
        // Generar la tarjeta de notificación directamente en el DOM
        const toast = document.createElement('div');
        toast.className = `toast-alerta ${tipo === 'error' ? 'toast-error' : 'toast-exito'}`;
        toast.innerHTML = `
            <i class='bx ${tipo === 'error' ? 'bx-error-circle' : 'bx-check-circle'}'></i>
            <span>${mensaje}</span>
        `;
        
        document.body.appendChild(toast);

        // Desvanecimiento gradual y limpieza del elemento
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
            toast.style.transition = 'all 0.4s ease';
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }
});