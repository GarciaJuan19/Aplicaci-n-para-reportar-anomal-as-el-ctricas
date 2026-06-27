import { db, auth } from './firebase-config.js'; 
import { collection, query, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

let mapa;
let capaMarcadores = L.layerGroup(); 

const COORDENADAS_DEFECTO = [20.3931, -89.3148]; 

document.addEventListener('DOMContentLoaded', () => {
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("Usuario autenticado:", user.uid);
            inicializarMapa();
            cargarReportesEnTiempoReal();
        } else {
            window.location.href = 'login.html';
        }
    });

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

    function cargarReportesEnTiempoReal() {
        const q = query(collection(db, "reportes"));

        // ✅ Flag para solo hacer fitBounds la primera vez
        let primeraVez = true;

        onSnapshot(q, (querySnapshot) => {
            capaMarcadores.clearLayers(); 
            
            const limitesMapa = L.latLngBounds();
            let tienePuntos = false;

            querySnapshot.forEach((doc) => {
                const reporte = doc.data();
                
                const tipo_anomalia = reporte.tipoAnomalia;
                const descripcion = reporte.descripcion;
                const estado = reporte.estado || 'pendiente';

                if (estado.toLowerCase() === "resuelto") return;

                const ubicacion = reporte.ubicacion; 

                if (ubicacion && ubicacion.latitud && ubicacion.longitud) {
                    const lat = parseFloat(ubicacion.latitud);
                    const lng = parseFloat(ubicacion.longitud);

                    if (!isNaN(lat) && !isNaN(lng)) {
                        let bgColor, textColor;
                        const estadoLower = estado.toLowerCase();
                        
                        if (estadoLower === 'pendiente' || estadoLower === 'enviado') {
                            bgColor = '#fef3c7';
                            textColor = '#d97706';
                        } else if (estadoLower === 'en revisión' || estadoLower === 'en revision') {
                            bgColor = '#e0f2fe';
                            textColor = '#0369a1';
                        } else {
                            bgColor = '#f1f5f9';
                            textColor = '#64748b';
                        }

                        const estadoMostrar = estado.charAt(0).toUpperCase() + estado.slice(1).toLowerCase();

                        const popupContenido = `
                            <div class="map-popup">
                                <h3 style="margin:0 0 4px 0; font-size:14px; color:#0f172a; text-transform:capitalize;">${tipo_anomalia || 'Anomalía'}</h3>
                                <p style="margin:0 0 6px 0; font-size:12px; color:#475569;">${descripcion || 'Sin descripción.'}</p>
                                <span style="display:inline-block; padding:2px 8px; border-radius:8px; font-size:10px; font-weight:700; text-transform:uppercase; background-color:${bgColor}; color:${textColor};">${estadoMostrar}</span>
                            </div>
                        `;

                        const marcador = L.marker([lat, lng]).bindPopup(popupContenido);
                        marcador.addTo(capaMarcadores);

                        limitesMapa.extend([lat, lng]);
                        tienePuntos = true;
                    }
                }
            });

            // ✅ Solo centra el mapa la primera vez
            if (tienePuntos && mapa && primeraVez) {
                mapa.fitBounds(limitesMapa, { padding: [40, 40] });
                primeraVez = false;
            }

        }, (error) => {
            console.error("Error en onSnapshot de Firebase:", error);
        });
    }
});