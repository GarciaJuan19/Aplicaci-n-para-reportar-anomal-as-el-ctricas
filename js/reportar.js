import { db, auth } from './firebase-config.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    
    // --- REFERENCIAS DE DISPARADORES Y CAPTURA ---
    const btnCamara = document.getElementById('btn-camara');
    const previewContainer = document.getElementById('preview-container');
    const imgPreview = document.getElementById('img-preview');
    const btnRemoveImg = document.getElementById('btn-remove-img');

    // Elementos del Nuevo Selector Dinámico
    const modalMediaPicker = document.getElementById('modal-media-picker');
    const btnChooseCamera = document.getElementById('btn-choose-camera');
    const btnChooseGallery = document.getElementById('btn-choose-gallery');
    const btnCloseMediaModal = document.getElementById('btn-close-media-modal');
    const inputGaleria = document.getElementById('input-galeria');
    const inputCamara = document.getElementById('input-camara');

    // --- REFERENCIAS DEL GPS ---
    const btnLocation = document.getElementById('btn-location');
    const geoText = document.getElementById('geo-text');
    const geoSuccessIcon = document.getElementById('geo-success');
    const inputLat = document.getElementById('latitud');
    const inputLng = document.getElementById('longitud');

    // --- REFERENCIA DEL FORMULARIO ---
    const formReporte = document.getElementById('form-reporte');
    const btnEnviar = document.getElementById('btn-enviar');

    let base64ReportImage = null; // Guardará el string final comprimido para Firestore

    // 1. FLUJO INTERACTIVO DEL MODAL
    btnCamara.addEventListener('click', () => {
        modalMediaPicker.classList.remove('hidden'); // Desplegar ventana de opciones
    });

    btnCloseMediaModal.addEventListener('click', () => {
        modalMediaPicker.classList.add('hidden'); // Ocultar si cancela
    });

    btnChooseCamera.addEventListener('click', () => {
        modalMediaPicker.classList.add('hidden');
        inputCamara.click(); // Abre la cámara del móvil nativamente
    });

    btnChooseGallery.addEventListener('click', () => {
        modalMediaPicker.classList.add('hidden');
        inputGaleria.click(); // Abre la galería de fotos nativa
    });

    // 2. FUNCIÓN PROCESADORA DE IMAGEN A BASE64
    function procesarArchivoImagen(file) {
        if (file) {
            // Validar que no supere 1MB para no saturar Firestore
            if (file.size > 1024 * 1024) {
                alert("⚠️ La imagen seleccionada es muy pesada. Intenta con otra menor a 1MB.");
                return;
            }

            const reader = new FileReader();
            reader.onload = function(event) {
                base64ReportImage = event.target.result;
                imgPreview.src = base64ReportImage;
                previewContainer.classList.remove('hidden'); 
                btnCamara.classList.add('hidden');           
            };
            reader.readAsDataURL(file);
        }
    }

    // Escuchadores de eventos para ambos flujos independientes
    inputCamara.addEventListener('change', (e) => procesarArchivoImagen(e.target.files[0]));
    inputGaleria.addEventListener('change', (e) => procesarArchivoImagen(e.target.files[0]));

    // Quitar la imagen y resetear el componente de carga
    btnRemoveImg.addEventListener('click', (e) => {
        e.stopPropagation(); 
        inputCamara.value = ''; 
        inputGaleria.value = ''; 
        imgPreview.src = '';
        base64ReportImage = null;
        previewContainer.classList.add('hidden');
        btnCamara.classList.remove('hidden');
    });

    // 3. LÓGICA DE GEOLOCALIZACIÓN GPS
    btnLocation.addEventListener('click', () => {
        if (!navigator.geolocation) {
            geoText.innerText = "Tu dispositivo no soporta geolocalización.";
            return;
        }

        btnLocation.disabled = true;
        geoText.innerText = "Ubicando dispositivo con el GPS...";

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                inputLat.value = lat;
                inputLng.value = lng;

                geoText.innerText = `Ubicación fijada: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                geoText.classList.add('success-text');
                geoSuccessIcon.classList.remove('hidden');
                btnLocation.disabled = false;
            },
            (error) => {
                btnLocation.disabled = false;
                geoSuccessIcon.classList.add('hidden');
                
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        geoText.innerText = "Debes permitir el acceso al GPS.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        geoText.innerText = "La señal GPS no está disponible.";
                        break;
                    case error.TIMEOUT:
                        geoText.innerText = "Tiempo de espera de ubicación agotado.";
                        break;
                    default:
                        geoText.innerText = "Error de geolocalización.";
                        break;
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,          
                maximumAge: 0            
            }
        );
    });

    // 4. SUBIDA COMPLETA DEL REPORTE A LA NUBE
    formReporte.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        const user = auth.currentUser;
        if (!user) {
            alert("Debes iniciar sesión para enviar un reporte.");
            return;
        }

        const tipoFalla = document.getElementById('tipo-falla').value;
        const descripcion = document.getElementById('descripcion').value;
        const lat = inputLat.value;
        const lng = inputLng.value;

        if (!lat || !lng) {
            alert("⚠️ Por favor, obtén tu ubicación GPS antes de enviar el reporte.");
            return;
        }

        btnEnviar.disabled = true;
        btnEnviar.innerText = "Subiendo reporte a la nube...";

        try {
            // Mapeamos los datos estructurados incluyendo la foto si existe
            const nuevoReporteData = {
                id_usuario: user.uid,
                tipo_anomalia: tipoFalla,
                descripcion: descripcion,
                ubicacion: {
                    latitud: parseFloat(lat),
                    longitud: parseFloat(lng)
                },
                estado: "pendiente", 
                fecha_creacion: new Date().toISOString()
            };

            // Adjuntar foto en formato Base64 de forma opcional al reporte NoSQL
            if (base64ReportImage) {
                nuevoReporteData.fotoUrl = base64ReportImage;
            }

            const docRef = await addDoc(collection(db, "reportes"), nuevoReporteData);

            alert(`🎉 ¡Reporte enviado con éxito!\nCódigo de folio: ${docRef.id}`);
            
            // Limpieza completa posterior al éxito
            formReporte.reset();
            inputCamara.value = '';
            inputGaleria.value = '';
            base64ReportImage = null;
            geoSuccessIcon.classList.add('hidden');
            geoText.innerText = "Ubicación no establecida";
            geoText.classList.remove('success-text');
            previewContainer.classList.add('hidden');
            btnCamara.classList.remove('hidden');

        } catch (error) {
            console.error("Error de Firestore: ", error);
            alert("❌ Ocurrió un error al conectar con el servidor. Revisa tu conexión.");
        } finally {
            btnEnviar.disabled = false;
            btnEnviar.innerHTML = "<i class='bx bx-send'></i> Enviar Reporte";
        }
    });
});