import { db, auth } from './firebase-config.js'; 
import { collection, query, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

let mapa;
let capaMarcadores = L.layerGroup(); 

// Centro inicial por defecto (Maní, Yucatán)
const COORDENADAS_DEFECTO = [20.3931, -89.3148]; 

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("Usuario autenticado:", user.uid);
            inicializarMapa();
            cargarReportesEnTiempoRealAdmin();
        } else {
            window.location.href = 'login.html';
        }
    });
    // 1. CONTROL DE ACCESO (RN-06)
    /*onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Validar si el usuario es administrador
            const esAdmin = user.email === 'admin@gmail.com' || user.email.endsWith('@admin.com');
            
            if (!esAdmin) {
                alert("⛔ Acceso denegado. No tienes permisos de Administrador.");
                await signOut(auth); // Forzar cierre para evitar bucles
                window.location.href = 'index.html';
            } else {
                console.log("Admin autenticado:", user.uid);
                inicializarMapa();
                cargarReportesEnTiempoRealAdmin();
            }
        } else {
            window.location.href = 'index.html';
        }
    }); */

    // 2. INICIALIZAR LEAFLET (Idéntico al de usuario)
    function inicializarMapa() {
        if (mapa) return;

        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        mapa = L.map('map', {
            zoomControl: false 
        }).setView(COORDENADAS_DEFECTO, 13);

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const miUbicacion = [position.coords.latitude, position.coords.longitude];
                L.circle(miUbicacion, {
                    color: '#0052cc', // Color institucional para el admin
                    fillColor: '#0052cc',
                    fillOpacity: 0.15,
                    radius: 50
                }).addTo(mapa).bindPopup("<b>Tu ubicación actual (Admin)</b>");
            });
        }

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(mapa);

        capaMarcadores.addTo(mapa);
    }

    // Funcionalidad para cambiar color de marcador según el estado
    function obtenerIconoPorEstado(estado) {
        const est = estado ? estado.toLowerCase().trim() : "pendiente";
        let color = "red"; // "pendiente" o "enviado" -> Rojo

        if (est === "en revisión" || est === "en revision") {
            color = "orange";
        } else if (est === "resuelto") {
            color = "green";
        }

        return new L.Icon({
            iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });
    }

    // 3. CARGAR Y ENCUADRAR REPORTES (Misma lógica con fitBounds)
    function cargarReportesEnTiempoRealAdmin() {
        const q = query(collection(db, "reportes"));

        onSnapshot(q, (querySnapshot) => {
            capaMarcadores.clearLayers(); 
            
            const limitesMapa = L.latLngBounds();
            let tienePuntos = false;

            console.log(`Leyendo del Firestore (Admin)... Total: ${querySnapshot.size}`);

            querySnapshot.forEach((doc) => {
                const reporte = doc.data();
                
                // Nota: El administrador ve TODOS los reportes, incluidos los "resueltos"
                const ubicacion = reporte.ubicacion; 
                const tipo_anomalia = reporte.tipo_anomalia;
                const estado = reporte.estado ? reporte.estado.toLowerCase() : 'pendiente';
                const descripcion = reporte.descripcion;

                if (ubicacion && ubicacion.latitud && ubicacion.longitud) {
                    const lat = parseFloat(ubicacion.latitud);
                    const lng = parseFloat(ubicacion.longitud);

                    if (!isNaN(lat) && !isNaN(lng)) {
                        
                        // Paleta de colores para los badges dentro del popup
                        let bgBadge = '#ffe4e6'; let textBadge = '#e11d48';
                        if (estado === 'en revisión' || estado === 'en revision') { bgBadge = '#fef3c7'; textBadge = '#d97706'; }
                        if (estado === 'resuelto') { bgBadge = '#dcfce7'; textBadge = '#16a34a'; }

                        const popupContenido = `
                            <div class="map-popup" style="font-family: system-ui;">
                                <h3 style="margin:0 0 4px 0; font-size:14px; color:#0f172a; text-transform: capitalize;">
                                    <i class='bx bx-bolt'></i> ${tipo_anomalia || 'Anomalía'}
                                </h3>
                                <p style="margin:0 0 6px 0; font-size:12px; color:#475569;">${descripcion || 'Sin descripción.'}</p>
                                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 6px;">
                                    <span style="font-size:10px; color:#94a3b8;">ID: ${doc.id.substring(0,6)}</span>
                                    <span style="
                                        display:inline-block;
                                        padding:2px 8px;
                                        border-radius:6px;
                                        font-size:10px;
                                        font-weight:700;
                                        text-transform:uppercase;
                                        background-color: ${bgBadge};
                                        color: ${textBadge};
                                    ">${estado}</span>
                                </div>
                            </div>
                        `;

                        // Añadir marcador de color con su popup
                        const marcador = L.marker([lat, lng], { icon: obtenerIconoPorEstado(estado) })
                                          .bindPopup(popupContenido);
                        marcador.addTo(capaMarcadores);

                        limitesMapa.extend([lat, lng]);
                        tienePuntos = true;
                    }
                }
            });

            // Ajustar automáticamente la cámara para enfocar los puntos
            if (tienePuntos && mapa) {
                mapa.fitBounds(limitesMapa, { padding: [40, 40] }); 
            }

        }, (error) => {
            console.error("Error en onSnapshot de Firebase:", error);
        });
    }
});