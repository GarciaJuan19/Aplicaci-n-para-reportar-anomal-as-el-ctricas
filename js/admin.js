import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('reports-container');
    const searchInput = document.getElementById('search-input');
    const pills = document.querySelectorAll('.filter-pills .pill');
    const btnLogout = document.getElementById('btn-logout');

    let todosLosReportes = [];
    let filtroEstadoActual = 'Todos'; // Controlado en Mayúsculas por las píldoras HTML

    // --- RN-06: VALIDACIÓN DE ACCESO DE ADMINISTRADOR ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const esAdmin = user.email === 'admin1@gmail.com' || user.email.endsWith('@admin.com');
            if (!esAdmin) {
                alert("⛔ Acceso denegado. Tu cuenta no tiene permisos de Administrador.");
                await signOut(auth);
                window.location.href = 'index.html'; 
            } else {
                cargarReportesFirestore();
            }
        } else {
            window.location.href = 'index.html';
        }
    });

    // --- LEER REPORTES DESDE FIRESTORE EN TIEMPO REAL ---
    function cargarReportesFirestore() {
        // Ordenamos por tu campo real: 'fecha_creacion'
        const q = query(collection(db, "reportes"), orderBy("fecha_creacion", "desc"));
        
        onSnapshot(q, (snapshot) => {
            todosLosReportes = [];
            snapshot.forEach((doc) => {
                todosLosReportes.push({ id: doc.id, ...doc.data() });
            });
            renderizarReportes();
        }, (error) => {
            console.error("Error al obtener reportes: ", error);
            container.innerHTML = `<p class="loading-state">Error al conectar con Firestore o falta índice.</p>`;
        });
    }

    // --- RENDERIZAR E INYECTAR LAS TARJETAS ADAPTADO A TU BASE DE DATOS ---
    function renderizarReportes() {
        const textoBusqueda = searchInput.value.toLowerCase().trim();
        container.innerHTML = "";

        const reportesFiltrados = todosLosReportes.filter(reporte => {
            // Convertimos el estado de la DB a Mayúsculas para que coincida con las píldoras ("pendiente" -> "PENDIENTE")
            const estadoDB = reporte.estado ? reporte.estado.toUpperCase() : "PENDIENTE";
            const coincideEstado = (filtroEstadoActual === 'Todos' || estadoDB === filtroEstadoActual);
            
            // Adaptado a tus campos: 'tipo_anomalia' y 'descripcion'
            const tituloDoc = (reporte.tipo_anomalia || "Reporte").toLowerCase();
            const descDoc = (reporte.descripcion || "").toLowerCase();
            
            const coincideTexto = tituloDoc.includes(textoBusqueda) || descDoc.includes(textoBusqueda);
            return coincideEstado && coincideTexto;
        });

        if (reportesFiltrados.length === 0) {
            container.innerHTML = `<div class="loading-state"><p>No se encontraron incidencias.</p></div>`;
            return;
        }

        reportesFiltrados.forEach(reporte => {
            const estadoFormateado = reporte.estado ? reporte.estado.toUpperCase() : "PENDIENTE";
            
            let badgeClass = "pendiente";
            if (estadoFormateado === "EN REVISIÓN" || estadoFormateado === "EN REVISION") badgeClass = "en-revision";
            if (estadoFormateado === "RESUELTO") badgeClass = "resuelto";

            // Formatear la fecha para que no se vea el string ISO plano de forma tosca
            let fechaMostrar = "Reciente";
            if (reporte.fecha_creacion) {
                const f = new Date(reporte.fecha_creacion);
                fechaMostrar = !isNaN(f) ? f.toLocaleDateString() + " " + f.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : reporte.fecha_creacion;
            }

            // Validar si existe el objeto ubicacion y mapear coordenadas si no hay dirección textual
            let ubicacionTexto = "Mani, Yucatán";
            if (reporte.ubicacion && reporte.ubicacion.latitud) {
                ubicacionTexto = `Lat: ${reporte.ubicacion.latitud.toFixed(4)}, Lon: ${reporte.ubicacion.longitud.toFixed(4)}`;
            }

            const card = document.createElement('div');
            card.className = 'report-card';
            card.innerHTML = `
                <div class="card-header-info">
                    <div class="title-block">
                        <div class="icon-type"><i class='bx bx-bolt'></i></div>
                        <div class="text-meta">
                            <h3 style="text-transform: capitalize;">${reporte.tipo_anomalia || 'Falla Eléctrica'}</h3>
                            <span><i class='bx bx-time-five'></i> ${fechaMostrar}</span>
                        </div>
                    </div>
                    <span class="badge-status ${badgeClass}">${estadoFormateado}</span>
                </div>
                
                <div class="card-location" style="margin-bottom: 6px;">
                    <i class='bx bx-map'></i>
                    <span>${ubicacionTexto}</span>
                </div>

                <p style="font-size: 0.9rem; color: #475569; margin: 0 0 10px 0; text-align: left;">
                    <strong>Descripción:</strong> ${reporte.descripcion || 'Sin descripción.'}
                </p>

                <div class="card-actions">
                    <button class="btn-details">Ver Detalles</button>
                    <select class="select-action" data-id="${reporte.id}">
                        <option value="" disabled selected>Cambiar Estado</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="en revisión">En revisión</option>
                        <option value="resuelto">Resuelto</option>
                    </select>
                </div>
            `;

            const select = card.querySelector('.select-action');
            select.addEventListener('change', async (e) => {
                const nuevoEstado = e.target.value; // Guardará en minúsculas como tu diseño original
                const docId = e.target.getAttribute('data-id');
                
                if (confirm(`¿Confirmas cambiar el estado de este reporte a "${nuevoEstado}"?`)) {
                    await actualizarEstadoReporte(docId, nuevoEstado);
                } else {
                    e.target.value = "";
                }
            });

            container.appendChild(card);
        });
    }

    // --- ACTUALIZAR EN FIRESTORE (RN-07, RN-09, CA-04) ---
    async function actualizarEstadoReporte(id, nuevoEstado) {
        const docRef = doc(db, "reportes", id);
        const timestampActual = new Date().toISOString();

        try {
            let datosActualizados = {
                estado: nuevoEstado,
                ultima_modificacion: timestampActual 
            };

            if (nuevoEstado === "resuelto") {
                datosActualizados.fecha_resolucion = timestampActual;
            }

            await updateDoc(docRef, datosActualizados);
            alert("✨ Estado del reporte actualizado con éxito.");
        } catch (error) {
            console.error("Error al actualizar estado:", error);
            alert("❌ No se pudo guardar la modificación.");
        }
    }

    // --- ESCUCHADORES DE FILTROS Y BÚSQUEDA ---
    searchInput.addEventListener('input', renderizarReportes);

    pills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            pills.forEach(p => p.classList.remove('active'));
            e.target.classList.add('active');
            filtroEstadoActual = e.target.getAttribute('data-status');
            renderizarReportes();
        });
    });

    btnLogout.addEventListener('click', () => {
        signOut(auth).then(() => window.location.href = 'index.html');
    });
});