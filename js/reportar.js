
import { db, auth } from './firebase-config.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Esperar a que el DOM de la página esté listo
document.addEventListener('DOMContentLoaded', () => {
    
    // REFERENCIAS DE LA CÁMARA 
    const btnCamara = document.getElementById('btn-camara');
    const inputFile = document.getElementById('input-file');
    const previewContainer = document.getElementById('preview-container');
    const imgPreview = document.getElementById('img-preview');
    const btnRemoveImg = document.getElementById('btn-remove-img');

    // --- REFERENCIAS DEL GPS ---
    const btnLocation = document.getElementById('btn-location');
    const geoText = document.getElementById('geo-text');
    const geoSuccessIcon = document.getElementById('geo-success');
    const inputLat = document.getElementById('latitud');
    const inputLng = document.getElementById('longitud');

    // --- REFERENCIA DEL FORMULARIO 
    const formReporte = document.getElementById('form-reporte');
    const btnEnviar = document.getElementById('btn-enviar');

    // Simular el click en el input oculto al presionar la tarjeta punteada
    btnCamara.addEventListener('click', () => {
        inputFile.click();
    });

    // Capturar el archivo de imagen seleccionado o tomado por la cámara
    inputFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        
        if (file) {
            const reader = new FileReader();
            
            // Renderizar la imagen en pantalla en formato Base64 al terminar de leerla
            reader.onload = function(event) {
                imgPreview.src = event.target.result;
                previewContainer.classList.remove('hidden'); // Muestra la foto
                btnCamara.classList.add('hidden');           // Oculta el cargador
            }
            
            reader.readAsDataURL(file);
        }
    });

    // Quitar la imagen y resetear el componente de carga
    btnRemoveImg.addEventListener('click', (e) => {
        e.stopPropagation(); // Evita que el evento afecte al contenedor padre
        inputFile.value = ''; 
        imgPreview.src = '';
        previewContainer.classList.add('hidden');
        btnCamara.classList.remove('hidden');
    });


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

                // Guardar las coordenadas en los inputs ocultos
                inputLat.value = lat;
                inputLng.value = lng;

                // Actualizar la interfaz visualmente
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
                enableHighAccuracy: true, // Forzar la máxima precisión del GPS del móvil
                timeout: 10000,           // Tiempo límite de respuesta: 10 segundos
                maximumAge: 0             // No utilizar datos guardados en caché
            }
        );
    });

// Enviar datos a firebase al enviar el formulario
    formReporte.addEventListener('submit', async (e) => {
        e.preventDefault(); // Detener la recarga por defecto de la página

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

        // Bloquear interfaz para evitar múltiples envíos accidentales
        btnEnviar.disabled = true;
        btnEnviar.innerText = "Subiendo reporte a la nube...";

        try {
            // Estructurar e insertar el documento NoSQL dentro de la colección "reportes"
            const docRef = await addDoc(collection(db, "reportes"), {
                id_usuario: user.uid,
                tipo_anomalia: tipoFalla,
                descripcion: descripcion,
                ubicacion: {
                    latitud: parseFloat(lat),
                    longitud: parseFloat(lng)
                },
                estado: "pendiente", 
                fecha_creacion: new Date().toISOString()
            });

            alert(`🎉 ¡Reporte enviado con éxito!\nCódigo de folio: ${docRef.id}`);
            
            // Limpiar todo el formulario tras el éxito
            formReporte.reset();
            geoSuccessIcon.classList.add('hidden');
            geoText.innerText = "Ubicación no establecida";
            geoText.classList.remove('success-text');
            previewContainer.classList.add('hidden');
            btnCamara.classList.remove('hidden');

        } catch (error) {
            console.error("Error de Firestore: ", error);
            alert("❌ Ocurrió un error al conectar con el servidor. Revisa tu conexión.");
        } finally {
            // Reestablecer el estado original del botón de acción
            btnEnviar.disabled = false;
            btnEnviar.innerHTML = "<i class='bx bx-send'></i> Enviar Reporte";
        }
    });

});