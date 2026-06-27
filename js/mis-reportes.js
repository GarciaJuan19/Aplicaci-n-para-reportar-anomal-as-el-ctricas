import { db, auth } from './firebase-config.js';
import { collection, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

let reportesGlobales = [];
let filtroActual = 'Todos';

document.addEventListener('DOMContentLoaded', () => {
    const contenedorReportes = document.getElementById('contenedor-reportes');
    const botonesFiltro = document.querySelectorAll('.filter-tabs .tab');

    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("✅ Usuario activo:", user.uid);

            const q = query(
                collection(db, "reportes"),
                where("idUsuario", "==", user.uid),
                orderBy("fechaCreacion", "desc")
            );

            onSnapshot(q, (querySnapshot) => {
                reportesGlobales = [];
                querySnapshot.forEach((doc) => {
                    reportesGlobales.push({ id: doc.id, ...doc.data() });
                });
                console.log("📊 Reportes encontrados:", reportesGlobales.length);
                renderizarReportes(filtroActual);
            }, (error) => {
                console.error("❌ Error:", error);
            });

        } else {
            console.warn("⚠️ Usuario no autenticado");
            if (contenedorReportes) {
                contenedorReportes.innerHTML = `
                    <div class="no-reports-fallback">
                        <i class='bx bx-error-circle'></i>
                        <p>Debes iniciar sesión para ver tus reportes.</p>
                    </div>`;
            }
        }
    });

    botonesFiltro.forEach(boton => {
        boton.addEventListener('click', () => {
            botonesFiltro.forEach(b => b.classList.remove('active'));
            boton.classList.add('active');
            filtroActual = boton.textContent.trim();
            renderizarReportes(filtroActual);
        });
    });

    function normalizar(texto) {
        return texto
            .toLowerCase()
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, ""); // quita tildes
    }

    function renderizarReportes(filtro) {
        if (!contenedorReportes) return;
        contenedorReportes.innerHTML = '';

        if (reportesGlobales.length === 0) {
            contenedorReportes.innerHTML = `
                <div class="no-reports-fallback">
                    <i class='bx bx-notepad'></i>
                    <p>No tienes reportes aún. ¡Reporta tu primera anomalía!</p>
                </div>`;
            return;
        }

        let reportesFiltrados = reportesGlobales;
        if (filtro !== 'Todos') {
            reportesFiltrados = reportesGlobales.filter(reporte => {
                const estadoReporte = normalizar(reporte.estado || 'pendiente');
                const estadoFiltro = normalizar(filtro);

                // "Pendiente" agrupa también reportes con estado "enviado"
                if (estadoFiltro === 'pendiente') {
                    return estadoReporte === 'pendiente' || estadoReporte === 'enviado';
                }

                return estadoReporte === estadoFiltro;
            });
        }

        if (reportesFiltrados.length === 0) {
            contenedorReportes.innerHTML = `
                <div class="no-reports-fallback">
                    <i class='bx bx-notepad'></i>
                    <p>No tienes reportes en estado <strong>"${filtro}"</strong>.</p>
                </div>`;
            return;
        }

        reportesFiltrados.forEach(reporte => {
            let claseEstado = 'status-default';
            const estadoNormalizado = normalizar(reporte.estado || 'pendiente');

            if (estadoNormalizado === 'pendiente' || estadoNormalizado === 'enviado') {
                claseEstado = 'status-sent';
            } else if (estadoNormalizado === 'en revision') {
                claseEstado = 'status-review';
            } else if (estadoNormalizado === 'resuelto') {
                claseEstado = 'status-resolved';
            }

            let fechaLegible = "Fecha no disponible";
            if (reporte.fechaCreacion) {
                try {
                    const fechaObjeto = new Date(reporte.fechaCreacion);
                    if (!isNaN(fechaObjeto.getTime())) {
                        fechaLegible = fechaObjeto.toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    }
                } catch (e) {
                    console.warn("Error al formatear fecha:", e);
                }
            }

            const estadoMostrar = reporte.estado || 'Pendiente';
            const estadoCapitalizado = estadoMostrar.charAt(0).toUpperCase() + estadoMostrar.slice(1).toLowerCase();

            let icono = 'bx bx-error';
            const tipo = (reporte.tipoAnomalia || '').toLowerCase();
            //if (tipo.includes('poste')) icono = 'bx bx-grid-alt';
            //else if (tipo.includes('cable')) icono = 'bx bx-wrench';
            //else if (tipo.includes('corto')) icono = 'bx bx-flash';
            //else if (tipo.includes('luz') || tipo.includes('apagón')) icono = 'bx bx-bulb';
           // else if (tipo.includes('voltaje')) icono = 'bx bx-trending-up';
           // else if (tipo.includes('luminaria')) icono = 'bx bx-street-view';

            contenedorReportes.innerHTML += `
                <div class="report-card">
                    <div class="card-main-info">
                        <div class="report-icon-bg">
                            <i class='${icono}'></i>
                        </div>
                        <div class="report-details">
                            <h3>${reporte.tipoAnomalia || 'Anomalía reportada'}</h3>
                            <p class="report-location">
                                <i class='bx bx-map'></i> ${reporte.descripcion || 'Sin descripción disponible'}
                            </p>
                            <p class="report-time">
                                <i class='bx bx-time-five'></i> ${fechaLegible}
                            </p>
                        </div>
                    </div>
                    <span class="status-badge ${claseEstado}">${estadoCapitalizado}</span>
                </div>
            `;
        });
    }
});