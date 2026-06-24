import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, updatePassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    
    const profileNameInput = document.getElementById('profile-name');
    const profilePasswordInput = document.getElementById('profile-password');
    const togglePasswordBtn = document.getElementById('toggle-profile-pass');
    const formProfile = document.getElementById('form-profile');
    const btnSave = document.getElementById('btn-save-profile');
    
    const txtHeroName = document.getElementById('txt-user-name');
    const txtHeroEmail = document.getElementById('txt-user-email');
    const fileAvatar = document.getElementById('file-avatar');
    const profilePreview = document.getElementById('profile-preview');

    let currentUserDocRef = null;

    // --- PRECONDICIÓN: VERIFICAR AUTENTICACIÓN Y RECUPERAR DATOS ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            txtHeroEmail.textContent = user.email;
            currentUserDocRef = doc(db, "usuarios", user.uid); // Referencia RN-07 (cuenta propia)

            try {
                const docSnap = await getDoc(currentUserDocRef);
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    
                    // Cargar datos en el formulario (CA-01)
                    profileNameInput.value = userData.nombre || "";
                    txtHeroName.textContent = userData.nombre || "Ciudadano";
                    
                    if (userData.fotoUrl) {
                        profilePreview.src = userData.fotoUrl;
                    }
                } else {
                    console.log("No se encontró documento del usuario en Firestore.");
                }
            } catch (error) {
                console.error("Error recuperando Firestore:", error);
            }
        } else {
            // Si no está autenticado, redirigir al login inmediatamente
            window.location.href = 'index.html';
        }
    });

    // --- INTERACTIVIDAD: PREVISUALIZAR IMAGEN LOCAL (OPCIONAL) ---
    fileAvatar.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                profilePreview.src = event.target.result; // Cambia la vista previa local
            }
            reader.readAsDataURL(file);
        }
    });

    // --- INTERACTIVIDAD: MOSTRAR/OCULTAR CONTRASEÑA ---
    if (togglePasswordBtn && profilePasswordInput) {
        togglePasswordBtn.addEventListener('click', function () {
            const isPassword = profilePasswordInput.getAttribute('type') === 'password';
            profilePasswordInput.setAttribute('type', isPassword ? 'text' : 'password');
            this.classList.toggle('bx-hide');
            this.classList.toggle('bx-show');
        });
    }

    // --- VALIDACIÓN DE REGLAS DE NEGOCIO (RN-05) ---
    function validarContrasena(password) {
        // Criterio: Mínimo 8 caracteres, al menos una letra y al menos un número
        const tieneLetra = /[a-zA-Z]/.test(password);
        const tieneNumero = /[0-9]/.test(password);
        const longitudValida = password.length >= 8;

        return tieneLetra && tieneNumero && longitudValida;
    }

    // --- PROCESO: GUARDAR CAMBIOS (SUBMIT) ---
    formProfile.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nuevoNombre = profileNameInput.value.trim();
        const nuevaContrasena = profilePasswordInput.value.trim();

        // Cambiar estado del botón
        btnSave.disabled = true;
        btnSave.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Guardando...";

        try {
            // 1. Validar y actualizar Contraseña si el usuario escribió algo (RN-05)
            if (nuevaContrasena !== "") {
                if (!validarContrasena(nuevaContrasena)) {
                    alert("⚠️ La contraseña no cumple los criterios mínimos de seguridad:\n- Mínimo 8 caracteres.\n- Debe incluir letras y números.");
                    btnSave.disabled = false;
                    btnSave.innerHTML = "<i class='bx bx-save'></i> Guardar Cambios";
                    return; // Detiene el proceso (Mensaje de validación incorrecta)
                }

                // Si pasa la validación, se actualiza en Firebase Auth
                await updatePassword(auth.currentUser, nuevaContrasena);
            }

            // 2. Actualizar datos en Firebase Firestore (CA-04)
            if (currentUserDocRef) {
                await updateDoc(currentUserDocRef, {
                    nombre: nuevoNombre
                    // Nota: Aquí se puede adjuntar la URL de la foto si manejas Firebase Storage
                });

                // Actualizar interfaz visual superior instantáneamente (Postcondición)
                txtHeroName.textContent = nuevoNombre;

                // Mensaje de éxito (CA-05)
                alert("✨ ¡Perfil actualizado correctamente!");
                profilePasswordInput.value = ""; // Limpiar campo de clave por seguridad
            }

        } catch (error) {
            console.error("Error al actualizar:", error);
            if (error.code === 'auth/requires-recent-login') {
                alert("🔒 Por seguridad, necesitas reautenticarte (cerrar e iniciar sesión de nuevo) para cambiar tu contraseña.");
            } else {
                alert("❌ Ocurrió un error al guardar los cambios. Inténtalo de nuevo.");
            }
        } finally {
            btnSave.disabled = false;
            btnSave.innerHTML = "<i class='bx bx-save'></i> Guardar Cambios";
        }
    });
});