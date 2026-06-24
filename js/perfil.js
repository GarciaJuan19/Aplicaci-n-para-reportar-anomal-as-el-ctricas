import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, updatePassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    
    // --- ELEMENTOS DEL DOM ---
    const profileNameInput = document.getElementById('profile-name');
    const profilePasswordInput = document.getElementById('profile-password');
    const togglePasswordBtn = document.getElementById('toggle-profile-pass');
    const formProfile = document.getElementById('form-profile');
    const btnSave = document.getElementById('btn-save-profile');
    
    const txtHeroName = document.getElementById('txt-user-name');
    const txtHeroEmail = document.getElementById('txt-user-email');
    const fileAvatar = document.getElementById('file-avatar');
    const profilePreview = document.getElementById('profile-preview');
    const profileIconPlaceholder = document.getElementById('profile-icon-placeholder');

    let currentUserDocRef = null;
    let base64ImageString = null; // Guardará el string largo de la nueva imagen seleccionada

    // --- 1. VERIFICAR AUTENTICACIÓN Y CARGAR DATOS DE FIRESTORE ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Colocamos el correo del Auth como respaldo inmediato mientras descarga Firestore
            txtHeroEmail.textContent = user.email;
            currentUserDocRef = doc(db, "usuarios", user.uid);

            try {
                const docSnap = await getDoc(currentUserDocRef);
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    console.log("Datos reales leídos de Firestore:", userData);

                    // Mapeo exacto con los campos reales de tu Firestore (nombre, nombre_completo, correo_electronico)
                    const nombreFinal = userData.nombre || userData.nombre_completo || "Ciudadano";
                    const correoFinal = userData.correo_electronico || user.email;

                    // Pintar datos en la interfaz
                    profileNameInput.value = nombreFinal;
                    txtHeroName.textContent = nombreFinal;
                    txtHeroEmail.textContent = correoFinal;
                    
                    // Control visual del Avatar (Imagen vs Icono de usuario)
                    if (userData.fotoUrl && userData.fotoUrl.trim() !== "") {
                        profilePreview.src = userData.fotoUrl;
                        profilePreview.classList.remove('hidden');
                        if (profileIconPlaceholder) profileIconPlaceholder.classList.add('hidden');
                    } else {
                        profilePreview.classList.add('hidden');
                        if (profileIconPlaceholder) profileIconPlaceholder.classList.remove('hidden');
                    }
                } else {
                    console.log("No existe el documento para este UID en Firestore. Se creará al guardar.");
                    txtHeroName.textContent = "Usuario Nuevo";
                    profileNameInput.value = "";
                }
            } catch (error) {
                console.error("Error al traer datos de Firestore:", error);
            }
        } else {
            // Si el usuario no está logueado, redirigir al login
            window.location.href = 'index.html';
        }
    });

    // --- 2. INTERACTIVIDAD: CONVERTIR IMAGEN LOCAL A BASE64 ---
    fileAvatar.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validación de peso (Máximo 1MB para cuidar el almacenamiento de Firestore)
            if (file.size > 1024 * 1024) {
                alert("⚠️ La imagen es demasiado grande. Selecciona una menor a 1MB.");
                fileAvatar.value = "";
                return;
            }

            const reader = new FileReader();
            reader.onload = function(event) {
                base64ImageString = event.target.result; // Aquí se genera el string "data:image/...;base64,..."
                profilePreview.src = base64ImageString;
                
                // Intercambio de estados visuales
                profilePreview.classList.remove('hidden');
                if (profileIconPlaceholder) profileIconPlaceholder.classList.add('hidden');
            }
            reader.readAsDataURL(file);
        }
    });

    // --- 3. INTERACTIVIDAD: VER / OCULTAR CONTRASEÑA ---
    if (togglePasswordBtn && profilePasswordInput) {
        togglePasswordBtn.addEventListener('click', function () {
            const isPassword = profilePasswordInput.getAttribute('type') === 'password';
            profilePasswordInput.setAttribute('type', isPassword ? 'text' : 'password');
            this.classList.toggle('bx-hide');
            this.classList.toggle('bx-show');
        });
    }

    // --- 4. VALIDACIÓN DE REGLAS DE NEGOCIO (Mínimo 8 caracteres, letras y números) ---
    function validarContrasena(password) {
        const tieneLetra = /[a-zA-Z]/.test(password);
        const tieneNumero = /[0-9]/.test(password);
        const longitudValida = password.length >= 8;
        return tieneLetra && tieneNumero && longitudValida;
    }

    // --- 5. ENVIAR FORMULARIO: PROCESAR CAMBIOS EN FIRESTORE Y AUTH ---
    formProfile.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nuevoNombre = profileNameInput.value.trim();
        const nuevaContrasena = profilePasswordInput.value.trim();

        // Deshabilitar botón y poner animación de carga
        btnSave.disabled = true;
        btnSave.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Guardando...";

        try {
            // A) Actualizar contraseña en Firebase Auth si el usuario escribió algo
            if (nuevaContrasena !== "") {
                if (!validarContrasena(nuevaContrasena)) {
                    alert("⚠️ La contraseña no cumple los criterios mínimos de seguridad:\n- Mínimo 8 caracteres.\n- Debe incluir letras y números.");
                    btnSave.disabled = false;
                    btnSave.innerHTML = "<i class='bx bx-save'></i> Guardar Cambios";
                    return;
                }
                await updatePassword(auth.currentUser, nuevaContrasena);
            }

            // B) Guardar los cambios en Cloud Firestore
            if (currentUserDocRef) {
                // Actualizamos 'nombre' y 'nombre_completo' simultáneamente para mantener limpia tu estructura
                const datosActualizados = {
                    nombre: nuevoNombre,
                    nombre_completo: nuevoNombre
                };

                // Si hay un string de imagen Base64 listo, lo incrustamos en el mapa de actualización
                if (base64ImageString) {
                    datosActualizados.fotoUrl = base64ImageString;
                }

                await updateDoc(currentUserDocRef, datosActualizados);

                // Actualizar de inmediato el widget de texto superior
                txtHeroName.textContent = nuevoNombre;

                alert("✨ ¡Perfil actualizado correctamente!");
                profilePasswordInput.value = ""; // Limpiar campo de contraseña por seguridad
                base64ImageString = null; // Limpiar buffer temporal de la imagen
            }

        } catch (error) {
            console.error("Error crítico al actualizar el perfil:", error);
            if (error.code === 'auth/requires-recent-login') {
                alert("🔒 Por seguridad, necesitas cerrar sesión e iniciarla nuevamente para poder cambiar tu contraseña.");
            } else {
                alert("❌ Ocurrió un error al guardar los cambios en la base de datos.");
            }
        } finally {
            // Restaurar estado del botón
            btnSave.disabled = false;
            btnSave.innerHTML = "<i class='bx bx-save'></i> Guardar Cambios";
        }
    });
});