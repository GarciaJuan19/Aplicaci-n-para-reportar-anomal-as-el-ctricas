
import { db, auth } from './firebase-config.js';
import { collection, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

let reportesGlobales = []; // Guarda los reportes descargados de Firestore
let filtroActual = 'Todos'; // Controla qué pestaña está activa ("Todos", "Enviado", etc.)

const reportesEjemplo = [
    {
        id: 'demo-1',
        tipo_anomalia: 'Luminaria pública fallando',
        descripcion: 'Luminaria del parque con parpadeo continuo desde anoche.',
        estado: 'Enviado',
        fecha_creacion: new Date('2026-06-10T09:15:00').toISOString()
    },
    {
        id: 'demo-2',
        tipo_anomalia: 'Cable suelto',
        descripcion: 'Cable expuesto en la esquina de la calle principal.',
        estado: 'En revisión',
        fecha_creacion: new Date('2026-06-11T12:20:00').toISOString()
    },
    {
        id: 'demo-3',
        tipo_anomalia: 'Apagón en la zona',
        descripcion: 'Sin suministro eléctrico en 3 calles del sector.',
        estado: 'Resuelto',
        fecha_creacion: new Date('2026-06-12T18:40:00').toISOString()
    }
];

function normalizarTexto(valor) {
    return String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

document.addEventListener('DOMContentLoaded', () => {
    const contenedorReportes = document.getElementById('contenedor-reportes');
    const botonesFiltro = document.querySelectorAll('.filter-tabs .tab');

    // 1. ESCUCHAR EL ESTADO DE AUTENTICACIÓN DEL CIUDADANO
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("Usuario activo detectado:", user.uid);

            // CONSULTA SEGURA Y OPTIMIZADA 
            const q = query(
                collection(db, "reportes"),
                where("id_usuario", "==", user.uid),
                orderBy("fecha_creacion", "desc")
            );

            // Cambios en la base de datos en tiempo real (onSnapshot)
            onSnapshot(q, (querySnapshot) => {
                reportesGlobales = [];
                
                querySnapshot.forEach((doc) => {
                    reportesGlobales.push({ id: doc.id, ...doc.data() });
                });
                
                console.log("Datos actualizados desde Firestore:", reportesGlobales);
                
                // Renderizar las tarjetas inmediatamente con el filtro que esté seleccionado
                renderizarReportes(filtroActual);
            }, (error) => {
                console.error("Error al leer Firestore en tiempo real:", error);
                if (contenedorReportes) {
                    reportesGlobales = [];
                    renderizarReportes(filtroActual);
                }
            });

        } else {
            // Si no hay sesión, mostramos la vista de ejemplo para que la página se vea correctamente
            console.warn("Usuario no autenticado. Mostrando vista de ejemplo...");
            renderizarReportes(filtroActual);
        }
    });

    // INTERACCIÓN CON LAS PESTAÑAS DE FILTRADO
    botonesFiltro.forEach(boton => {
        boton.addEventListener('click', () => {
            
            botonesFiltro.forEach(b => b.classList.remove('active'));
            boton.classList.add('active');

            // Actualizar el estado del filtro global con el texto del botón ("Todos", "Enviado", "En revisión", "Resuelto")
            filtroActual = boton.textContent.trim();
            
            // Volver a pintar las tarjetas aplicando el nuevo filtro
            renderizarReportes(filtroActual);
        });
    });

    
    function renderizarReportes(filtro) {
        if (!contenedorReportes) return;
        contenedorReportes.innerHTML = ''; // Limpiar el contenedor para evitar duplicados

        const reportesBase = reportesGlobales.length > 0 ? reportesGlobales : reportesEjemplo;

        // Filtrar el arreglo local de datos según la pestaña seleccionada
        const reportesFiltrados = reportesBase.filter(reporte => {
            if (filtro === 'Todos') return true;

            const estadoReporte = normalizarTexto(reporte.estado);
            const estadoFiltro = normalizarTexto(filtro);

            return estadoReporte === estadoFiltro;
        });

        // Si la pestaña seleccionada está vacía, mostrar mensaje de aviso sutil
        if (reportesFiltrados.length === 0) {
            contenedorReportes.innerHTML = `
                <div class="no-reports-fallback">
                    <i class='bx bx-notepad'></i>
                    <p>No tienes anomalías en el estado <strong>"${filtro}"</strong>.</p>
                </div>`;
            return;
        }

        // Construir dinámicamente las tarjetas HTML para los reportes que pasaron el filtro
        reportesFiltrados.forEach(reporte => {
            
            // Determinar la clase de color del Badge según el estado de tu base de datos
            let claseEstado = 'status-default';
            const estadoNormalizado = normalizarTexto(reporte.estado);

            if (estadoNormalizado === 'enviado') {
                claseEstado = 'status-sent';
            } else if (estadoNormalizado === 'en revision' || estadoNormalizado === 'en revision') {
                claseEstado = 'status-review';
            } else if (estadoNormalizado === 'resuelto') {
                claseEstado = 'status-resolved';
            }

       
            let fechaLegible = "Fecha no disponible";
            if (reporte.fecha_creacion) {
                const fechaObjeto = new Date(reporte.fecha_creacion);
                fechaLegible = fechaObjeto.toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }

    
            const cardHTML = `
                <div class="report-card">
                    <div class="card-main-info">
                        <div class="report-icon-bg">
                            <i class='bx bx-error-alt'></i>
                        </div>
                        <div class="report-details">
                            <h3>${reporte.tipo_anomalia || 'Anomalía reportada'}</h3>
                            <p class="report-location">
                                <i class='bx bx-map'></i> ${reporte.descripcion || 'Sin descripción disponible'}
                            </p>
                            <p class="report-time">
                                <i class='bx bx-time-five'></i> ${fechaLegible}
                            </p>
                        </div>
                    </div>
                    <span class="status-badge ${claseEstado}">${reporte.estado || 'Enviado'}</span>
                </div>
            `;
            
            // Sumar la tarjeta generada al contenedor visible de la pantalla
            contenedorReportes.innerHTML += cardHTML;
        });
    }
});