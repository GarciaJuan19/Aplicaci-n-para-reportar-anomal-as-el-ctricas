
import { db, auth } from './firebase-config.js'; 
import { collection, query, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

let mapa;
let capaMarcadores = L.layerGroup(); 

// Centro inicial por defecto (Maní, Yucatán)
const COORDENADAS_DEFECTO = [20.3931, -89.3148]; 

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. CONTROL DE ACCESO
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("Usuario autenticado:", user.uid);
            inicializarMapa();
            cargarReportesEnTiempoReal();
        } else {
            window.location.href = 'login.html';
        }
    });

    // 2. INICIALIZAR LEAFLET
    // Busca la función inicializarMapa() dentro de js/mapa.js y reemplázala por esta versión corregida:
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
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.15,
                radius: 50
            }).addTo(mapa).bindPopup("<b>Tu ubicación actual</b>");
        });
    }

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapa);

    capaMarcadores.addTo(mapa);
}

    // 3. CARGAR Y ENCUADRAR REPORTES
    function cargarReportesEnTiempoReal() {
        const q = query(collection(db, "reportes"));

        onSnapshot(q, (querySnapshot) => {
            capaMarcadores.clearLayers(); 
            
            // Creamos un "contenedor" geométrico virtual para guardar los puntos encontrados
            const limitesMapa = L.latLngBounds();
            let tienePuntos = false;

            console.log(`Leyendo documentos de Firestore... Total encontrados: ${querySnapshot.size}`);

            querySnapshot.forEach((doc) => {
                const reporte = doc.data();
                
                if (reporte.estado === "Resuelto") return;

                const ubicacion = reporte.ubicacion; 
                const tipo_anomalia = reporte.tipo_anomalia;
                const estado = reporte.estado;
                const descripcion = reporte.descripcion;

                if (ubicacion && ubicacion.latitud && ubicacion.longitud) {
                    const lat = parseFloat(ubicacion.latitud);
                    const lng = parseFloat(ubicacion.longitud);

                    if (!isNaN(lat) && !isNaN(lng)) {
                        console.log(`Pintando marcador: ${tipo_anomalia} en [${lat}, ${lng}]`);
                        
                        const popupContenido = `
                            <div class="map-popup">
                                <h3 style="margin:0 0 4px 0; font-size:14px; color:#0f172a; text-transform: capitalize;">${tipo_anomalia || 'Anomalía'}</h3>
                                <p style="margin:0 0 6px 0; font-size:12px; color:#475569;">${descripcion || 'Sin descripción.'}</p>
                                <span style="
                                    display:inline-block;
                                    padding:2px 8px;
                                    border-radius:8px;
                                    font-size:10px;
                                    font-weight:700;
                                    text-transform:uppercase;
                                    background-color: ${estado === 'Enviado' ? '#fef3c7' : '#e0f2fe'};
                                    color: ${estado === 'Enviado' ? '#d97706' : '#0369a1'};
                                ">${estado || 'Enviado'}</span>
                            </div>
                        `;

                        // Añadir marcador a la capa
                        const marcador = L.marker([lat, lng]).bindPopup(popupContenido);
                        marcador.addTo(capaMarcadores);

                        // Expandir el contenedor virtual para que incluya esta coordenada
                        limitesMapa.extend([lat, lng]);
                        tienePuntos = true;
                    }
                }
            });

            
            if (tienePuntos && mapa) {
                console.log("Ajustando el zoom del mapa para mostrar todos los reportes...");
                mapa.fitBounds(limitesMapa, { padding: [40, 40] }); 
            }

        }, (error) => {
            console.error("Error en onSnapshot de Firebase:", error);
        });
    }
});