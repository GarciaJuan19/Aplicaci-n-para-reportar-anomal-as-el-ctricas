import { auth, db } from './firebase-config.js';
import { 
    onAuthStateChanged, 
    updatePassword, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    doc, 
    getDoc, 
    setDoc,   // 🆕 AGREGADO
    updateDoc,
    collection,
    query,
    getDocs,
    where
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
    subirImagen, 
    eliminarImagen, 
    generarRutaImagen, 
    fileToBase64 
} from './storage-utils.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // --- ELEMENTOS DEL DOM ---
    const profileNameInput = document.getElementById('profile-name');
    const profilePasswordInput = document.getElementById('profile-password');
    const togglePasswordBtn = document.getElementById('toggle-profile-pass');
    const formProfile = document.getElementById('form-profile');
    const btnSave = document.getElementById('btn-save-profile');
    const btnLogout = document.getElementById('btn-logout-admin');
    
    const txtHeroName = document.getElementById('txt-user-name');
    const txtHeroEmail = document.getElementById('txt-user-email');
    const fileAvatar = document.getElementById('file-avatar');
    const profilePreview = document.getElementById('profile-preview');
    const profileIconPlaceholder = document.getElementById('profile-icon-placeholder');

    // Estadísticas
    const totalReportesEl = document.getElementById('total-reportes');
    const pendientesEl = document.getElementById('reportes-pendientes');
    const resueltosEl = document.getElementById('reportes-resueltos');

    let currentUserDocRef = null;
    let fotoActualRef = null;
    let archivoSeleccionado = null;

    // ================================================
    // 🆕 FUNCIÓN PARA CREAR DOCUMENTO SI NO EXISTE
    // ================================================
    async function crearDocumentoSiNoExiste(user) {
        try {
            const docRef = doc(db, "usuarios", user.uid);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                console.log("📝 Documento no existe, creándolo...");
                
                // Crear documento con datos básicos
                await setDoc(docRef, {
                    nombre: "Administrador",
                    nombre_completo: "Administrador",
                    correo_electronico: user.email,
                    rol: "administrador",
                    fecha_registro: new Date().toISOString(),
                    fotoPerfil: null,
                    fotoPerfilRef: null
                });
                
                console.log("✅ Documento creado exitosamente");
                return true;
            }
            
            return true;
        } catch (error) {
            console.error("❌ Error al crear documento:", error);
            return false;
        }
    }

    // --- 1. VERIFICAR AUTENTICACIÓN Y CARGAR DATOS ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Verificar que sea administrador
            const esAdmin = user.email === 'admin1@gmail.com' || user.email.endsWith('@admin.com');
            if (!esAdmin) {
                alert('⛔ Acceso denegado. No tienes permisos de administrador.');
                await signOut(auth);
                window.location.href = '../login.html';
                return;
            }

            txtHeroEmail.textContent = user.email;
            currentUserDocRef = doc(db, "usuarios", user.uid);

            try {
                // ✅ PRIMERO: Crear documento si no existe
                await crearDocumentoSiNoExiste(user);
                
                // ✅ SEGUNDO: Cargar los datos
                const docSnap = await getDoc(currentUserDocRef);
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    const nombreFinal = userData.nombre || userData.nombre_completo || "Administrador";
                    const correoFinal = userData.correo_electronico || user.email;

                    const fotoUrl = userData.fotoPerfil || userData.fotoUrl || null;
                    fotoActualRef = userData.fotoPerfilRef || null;

                    profileNameInput.value = nombreFinal;
                    txtHeroName.textContent = nombreFinal;
                    txtHeroEmail.textContent = correoFinal;
                    
                    if (fotoUrl) {
                        profilePreview.src = fotoUrl;
                        profilePreview.classList.remove('hidden');
                        profileIconPlaceholder.classList.add('hidden');
                    } else {
                        profilePreview.classList.add('hidden');
                        profileIconPlaceholder.classList.remove('hidden');
                    }
                } else {
                    txtHeroName.textContent = "Administrador";
                    profileNameInput.value = "";
                }

                // --- CARGAR ESTADÍSTICAS ---
                await cargarEstadisticas();

            } catch (error) {
                console.error("Error al cargar datos:", error);
                mostrarToast('Error al cargar los datos del perfil', 'error');
            }
        } else {
            window.location.href = '../login.html';
        }
    });

    // --- 2. CARGAR ESTADÍSTICAS DE REPORTES ---
    async function cargarEstadisticas() {
        try {
            const reportesRef = collection(db, "reportes");
            const querySnapshot = await getDocs(reportesRef);
            
            let total = 0;
            let pendientes = 0;
            let resueltos = 0;

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                total++;
                
                const estado = (data.estado || '').toLowerCase();
                if (estado === 'pendiente' || estado === 'enviado') {
                    pendientes++;
                } else if (estado === 'resuelto') {
                    resueltos++;
                }
            });

            totalReportesEl.textContent = total;
            pendientesEl.textContent = pendientes;
            resueltosEl.textContent = resueltos;

        } catch (error) {
            console.error("Error al cargar estadísticas:", error);
            totalReportesEl.textContent = '--';
            pendientesEl.textContent = '--';
            resueltosEl.textContent = '--';
        }
    }

    // --- 3. MANEJAR CARGA DE IMAGEN ---
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

    // --- 4. MOSTRAR/OCULTAR CONTRASEÑA ---
    if (togglePasswordBtn && profilePasswordInput) {
        togglePasswordBtn.addEventListener('click', function () {
            const isPassword = profilePasswordInput.getAttribute('type') === 'password';
            profilePasswordInput.setAttribute('type', isPassword ? 'text' : 'password');
            this.classList.toggle('bx-hide');
            this.classList.toggle('bx-show');
        });
    }

    // --- 5. VALIDAR CONTRASEÑA ---
    function validarContrasena(password) {
        const tieneLetra = /[a-zA-Z]/.test(password);
        const tieneNumero = /[0-9]/.test(password);
        const longitudValida = password.length >= 8;
        return tieneLetra && tieneNumero && longitudValida;
    }

    // --- 6. GUARDAR CAMBIOS ---
    formProfile.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nuevoNombre = profileNameInput.value.trim();
        const nuevaContrasena = profilePasswordInput.value.trim();

        if (!nuevoNombre || nuevoNombre.length < 2) {
            mostrarToast('⚠️ El nombre debe tener al menos 2 caracteres.', 'error');
            return;
        }

        btnSave.disabled = true;
        btnSave.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Guardando...";

        try {
            // A) Actualizar contraseña
            if (nuevaContrasena !== "") {
                if (!validarContrasena(nuevaContrasena)) {
                    mostrarToast('⚠️ La contraseña debe tener mínimo 8 caracteres, letras y números.', 'error');
                    btnSave.disabled = false;
                    btnSave.innerHTML = "<i class='bx bx-save'></i> Guardar Cambios";
                    return;
                }
                await updatePassword(auth.currentUser, nuevaContrasena);
            }

            // B) Subir imagen a Storage si hay una nueva
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

            // C) ✅ Actualizar Firestore - CREAR si no existe
            if (currentUserDocRef) {
                const datosActualizados = {
                    nombre: nuevoNombre,
                    nombre_completo: nuevoNombre,
                    rol: 'administrador',
                    correo_electronico: auth.currentUser.email
                };

                if (nuevaFotoUrl) {
                    datosActualizados.fotoPerfil = nuevaFotoUrl;
                    datosActualizados.fotoPerfilRef = nuevaFotoRef;
                    datosActualizados.fotoUrl = nuevaFotoUrl;
                }

                // ✅ Usar setDoc con merge para crear o actualizar
                await setDoc(currentUserDocRef, datosActualizados, { merge: true });

                txtHeroName.textContent = nuevoNombre;
                if (nuevaFotoUrl) {
                    profilePreview.src = nuevaFotoUrl;
                    fotoActualRef = nuevaFotoRef;
                }

                mostrarToast('✨ ¡Perfil actualizado correctamente!', 'exito');
                profilePasswordInput.value = "";
                archivoSeleccionado = null;
                fileAvatar.value = "";
            }

        } catch (error) {
            console.error("Error al actualizar:", error);
            if (error.code === 'auth/requires-recent-login') {
                mostrarToast('🔒 Por seguridad, cierra sesión y vuelve a iniciar para cambiar la contraseña.', 'error');
            } else {
                mostrarToast('❌ Error al guardar los cambios: ' + error.message, 'error');
            }
        } finally {
            btnSave.disabled = false;
            btnSave.innerHTML = "<i class='bx bx-save'></i> Guardar Cambios";
        }
    });

    // --- 7. CERRAR SESIÓN ---
    btnLogout.addEventListener('click', async () => {
        if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            try {
                await signOut(auth);
                window.location.href = '../login.html';
            } catch (error) {
                console.error("Error al cerrar sesión:", error);
                mostrarToast('❌ Error al cerrar sesión.', 'error');
            }
        }
    });

    // --- 8. SISTEMA DE TOASTS ---
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

    // --- 9. ESTILOS ---
    const style = document.createElement('style');
    style.textContent = `
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
        .admin-badge {
            display: inline-block;
            background: #dbeafe;
            color: #1e40af;
            padding: 4px 14px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
            margin-top: 6px;
        }
        .admin-stats-card {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            background: #f8fafc;
            border-radius: 12px;
            padding: 16px;
            border: 1px solid #e2e8f0;
        }
        .stat-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
        }
        .stat-item i {
            font-size: 24px;
            color: #0a46d1;
            margin-bottom: 4px;
        }
        .stat-item .stat-number {
            font-size: 20px;
            font-weight: 700;
            color: #0f172a;
        }
        .stat-item .stat-label {
            font-size: 11px;
            color: #64748b;
            font-weight: 500;
            text-transform: uppercase;
        }
        .admin-actions {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .btn-logout {
            margin-top: 8px;
            background-color: rgba(239, 68, 68, 0.08);
            border: 1px solid rgba(239, 68, 68, 0.2);
            color: #dc2626;
            padding: 14px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: 100%;
            transition: background-color 0.15s ease;
            font-family: inherit;
        }
        .btn-logout:active {
            background-color: rgba(239, 68, 68, 0.15);
        }
        .btn-logout i {
            font-size: 20px;
        }
    `;
    document.head.appendChild(style);
});