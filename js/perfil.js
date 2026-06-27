import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, updatePassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { subirImagen, eliminarImagen, generarRutaImagen, fileToBase64 } from './storage-utils.js';

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
    let fotoActualRef = null;
    let archivoSeleccionado = null;

    // --- 1. VERIFICAR AUTENTICACIÓN Y CARGAR DATOS ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            txtHeroEmail.textContent = user.email;
            currentUserDocRef = doc(db, "usuarios", user.uid);

            try {
                const docSnap = await getDoc(currentUserDocRef);
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    const nombreFinal = userData.nombre || userData.nombre_completo || "Ciudadano";
                    
                    const fotoUrl = userData.fotoPerfil || userData.fotoUrl || null;
                    fotoActualRef = userData.fotoPerfilRef || null;

                    profileNameInput.value = nombreFinal;
                    txtHeroName.textContent = nombreFinal;
                    
                    if (fotoUrl) {
                        profilePreview.src = fotoUrl;
                        profilePreview.classList.remove('hidden');
                        profileIconPlaceholder.classList.add('hidden');
                    } else {
                        profilePreview.classList.add('hidden');
                        profileIconPlaceholder.classList.remove('hidden');
                    }
                } else {
                    txtHeroName.textContent = "Usuario Nuevo";
                    profileNameInput.value = "";
                }
            } catch (error) {
                console.error("Error al traer datos:", error);
                mostrarToast('Error al cargar los datos', 'error');
            }
        } else {
            window.location.href = 'login.html';
        }
    });

    // --- 2. SELECCIONAR IMAGEN ---
    fileAvatar.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 3 * 1024 * 1024) {
                mostrarToast('⚠️ La imagen es demasiado grande. Máximo 3MB.', 'error');
                fileAvatar.value = "";
                return;
            }

            if (!file.type.startsWith('image/')) {
                mostrarToast('⚠️ Selecciona una imagen válida.', 'error');
                fileAvatar.value = "";
                return;
            }

            archivoSeleccionado = file;

            fileToBase64(file).then(base64 => {
                profilePreview.src = base64;
                profilePreview.classList.remove('hidden');
                profileIconPlaceholder.classList.add('hidden');
                mostrarToast('📷 Imagen seleccionada', 'exito');
            }).catch(() => {
                mostrarToast('❌ Error al leer la imagen', 'error');
            });
        }
    });

    // --- 3. MOSTRAR/OCULTAR CONTRASEÑA ---
    if (togglePasswordBtn && profilePasswordInput) {
        togglePasswordBtn.addEventListener('click', function () {
            const isPassword = profilePasswordInput.getAttribute('type') === 'password';
            profilePasswordInput.setAttribute('type', isPassword ? 'text' : 'password');
            this.classList.toggle('bx-hide');
            this.classList.toggle('bx-show');
        });
    }

    // --- 4. VALIDAR CONTRASEÑA ---
    function validarContrasena(password) {
        const tieneLetra = /[a-zA-Z]/.test(password);
        const tieneNumero = /[0-9]/.test(password);
        const longitudValida = password.length >= 8;
        return tieneLetra && tieneNumero && longitudValida;
    }

    // --- 5. SISTEMA DE TOASTS ---
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
        }, 3500);
    }

    // --- 6. GUARDAR CAMBIOS ---
    formProfile.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nuevoNombre = profileNameInput.value.trim();
        const nuevaContrasena = profilePasswordInput.value.trim();

        btnSave.disabled = true;
        btnSave.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Guardando...";

        try {
            if (nuevaContrasena !== "") {
                if (!validarContrasena(nuevaContrasena)) {
                    mostrarToast('⚠️ Contraseña: mínimo 8 caracteres, letras y números.', 'error');
                    btnSave.disabled = false;
                    btnSave.innerHTML = "<i class='bx bx-save'></i> Guardar Cambios";
                    return;
                }
                await updatePassword(auth.currentUser, nuevaContrasena);
            }

            let nuevaFotoUrl = null;
            let nuevaFotoRef = null;

            if (archivoSeleccionado) {
                if (fotoActualRef) {
                    await eliminarImagen(fotoActualRef);
                }

                const uid = auth.currentUser.uid;
                const ruta = generarRutaImagen('usuarios', uid, archivoSeleccionado.name);
                
                nuevaFotoUrl = await subirImagen(archivoSeleccionado, ruta);
                nuevaFotoRef = ruta;
            }

            if (currentUserDocRef) {
                const datosActualizados = {
                    nombre: nuevoNombre,
                    nombre_completo: nuevoNombre
                };

                if (nuevaFotoUrl) {
                    datosActualizados.fotoPerfil = nuevaFotoUrl;
                    datosActualizados.fotoPerfilRef = nuevaFotoRef;
                    datosActualizados.fotoUrl = nuevaFotoUrl;
                }

                await updateDoc(currentUserDocRef, datosActualizados);

                txtHeroName.textContent = nuevoNombre;
                if (nuevaFotoUrl) {
                    profilePreview.src = nuevaFotoUrl;
                    fotoActualRef = nuevaFotoRef;
                }

                mostrarToast('✨ ¡Perfil actualizado!', 'exito');
                profilePasswordInput.value = "";
                archivoSeleccionado = null;
                fileAvatar.value = "";
            }

        } catch (error) {
            console.error("Error:", error);
            if (error.code === 'auth/requires-recent-login') {
                mostrarToast('🔒 Cierra sesión y vuelve a iniciar para cambiar la contraseña.', 'error');
            } else {
                mostrarToast('❌ Error: ' + error.message, 'error');
            }
        } finally {
            btnSave.disabled = false;
            btnSave.innerHTML = "<i class='bx bx-save'></i> Guardar Cambios";
        }
    });

    // Estilos para toast
    const styleToast = document.createElement('style');
    styleToast.textContent = `
        @keyframes slideUpToast {
            from { opacity: 0; transform: translateX(-50%) translateY(30px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .toast-alerta {
            animation: slideUpToast 0.3s ease-out !important;
        }
        .toast-alerta i {
            font-size: 20px;
        }
    `;
    document.head.appendChild(styleToast);
});