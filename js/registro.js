import { auth, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getBaseUrl, getMenuUrl, mostrarToast, esAppMovil, esLocalhost } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    const formularioRegistro = document.getElementById('form-registro');
    const inputNombre = document.getElementById('reg-nombre');
    const inputCorreo = document.getElementById('reg-correo');
    const inputPassword = document.getElementById('reg-password');
    const inputConfirmar = document.getElementById('reg-confirmar');
    const chkTerminos = document.getElementById('reg-terminos');
    const btnRegistrar = document.getElementById('btn-registrar');
    const btnVerPassword = document.getElementById('toggle-reg-password');

    console.log("📱 Plataforma:", esAppMovil() ? "APK/Móvil" : "Web");
    console.log("🌐 Localhost:", esLocalhost() ? "Sí" : "No");
    console.log("🔵 URL base:", getBaseUrl());
    console.log("🔵 URL menú (redirección post-verificación):", getMenuUrl());

    if (btnVerPassword && inputPassword && inputConfirmar) {
        btnVerPassword.addEventListener('click', () => {
            const tipoActual = inputPassword.getAttribute('type') === 'password' ? 'text' : 'password';
            inputPassword.setAttribute('type', tipoActual);
            inputConfirmar.setAttribute('type', tipoActual);
            
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

    if (formularioRegistro) {
        formularioRegistro.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nombre = inputNombre.value.trim();
            const correo = inputCorreo.value.trim();
            const password = inputPassword.value;
            const confirmar = inputConfirmar.value;

            if (!nombre || !correo || !password || !confirmar) {
                mostrarToast('Por favor, rellena todos los campos obligatorios.', 'error');
                return;
            }

            if (!chkTerminos.checked) {
                mostrarToast('Es necesario aceptar los términos y condiciones de uso.', 'error');
                return;
            }

            if (password !== confirmar) {
                mostrarToast('Las contraseñas ingresadas no coinciden.', 'error');
                inputConfirmar.focus();
                return;
            }

            const regexPassword = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
            if (!regexPassword.test(password)) {
                mostrarToast('La contraseña debe tener un mínimo de 8 caracteres e incluir letras y números.', 'error');
                inputPassword.focus();
                return;
            }

            try {
                btnRegistrar.disabled = true;
                btnRegistrar.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> Creando cuenta...`;

                const credencialUsuario = await createUserWithEmailAndPassword(auth, correo, password);
                const usuario = credencialUsuario.user;
                console.log("✅ Cuenta creada en Auth. UID:", usuario.uid);

                // 🔵 ENVIAR CORREO CON REDIRECCIÓN AL MENÚ
                try {
                    const menuUrl = getMenuUrl();
                    console.log("📧 Enviando verificación a:", correo);
                    console.log("🔗 Redirigirá a:", menuUrl);
                    
                    await sendEmailVerification(usuario, {
                        url: menuUrl,  // 🔵 AHORA REDIRIGE AL MENÚ
                        handleCodeInApp: false
                    });
                    console.log("✅ Correo de verificación enviado con éxito");
                } catch (emailError) {
                    console.error("❌ Error al enviar correo:", emailError);
                }

                await setDoc(doc(db, "usuarios", usuario.uid), {
                    id_usuario: usuario.uid,
                    nombre_completo: nombre,
                    correo_electronico: correo,
                    rol: "ciudadano",
                    fecha_registro: new Date().toISOString(),
                    email_verificado: false,
                    plataforma: esAppMovil() ? 'apk' : 'web'
                });

                console.log("✅ Perfil guardado en Firestore");

                mostrarToast(
                    '✅ ¡Registro exitoso! Te hemos enviado un correo de verificación. Revisa tu bandeja de entrada y SPAM.',
                    'exito'
                );

                formularioRegistro.reset();

                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);

            } catch (error) {
                console.error("❌ Error en registro:", error.code, error.message);
                btnRegistrar.disabled = false;
                btnRegistrar.innerHTML = `Registrar Cuenta`;

                switch (error.code) {
                    case 'auth/email-already-in-use':
                        mostrarToast('Este correo electrónico ya se encuentra registrado.', 'error');
                        inputCorreo.focus();
                        break;
                    case 'auth/invalid-email':
                        mostrarToast('El formato del correo electrónico ingresado no es válido.', 'error');
                        inputCorreo.focus();
                        break;
                    case 'auth/weak-password':
                        mostrarToast('La contraseña proporcionada es demasiado débil.', 'error');
                        inputPassword.focus();
                        break;
                    default:
                        mostrarToast('No se pudo completar el registro. Inténtalo de nuevo más tarde.', 'error');
                        break;
                }
            }
        });
    }
});