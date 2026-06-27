// ==========================================
//  UTILIDADES PARA TODAS LAS PLATAFORMAS
// ==========================================

export function esAppMovil() {
    return window.cordova !== undefined || 
           window.Capacitor !== undefined ||
           (navigator.userAgent.includes('Android') && window.navigator.standalone !== true) ||
           navigator.userAgent.includes('iPhone') || 
           navigator.userAgent.includes('iPad');
}

export function esLocalhost() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname === '0.0.0.0';
}

export function getBaseUrl() {
    if (esAppMovil()) {
        return 'https://fallocero-52d1d.web.app';
    }
    
    if (esLocalhost()) {
        return window.location.origin + '/t/FalloCero';
    }
    
    return 'https://fallocero-52d1d.web.app';
}

export function getLoginUrl() {
    return getBaseUrl() + '/login.html';
}

export function getMenuUrl() {
    return getBaseUrl() + '/menu.html';
}

export function mostrarToast(mensaje, tipo = 'exito') {
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
    }, 4000);
}

if (!document.getElementById('toast-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'toast-styles';
    styleSheet.textContent = `
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
    document.head.appendChild(styleSheet);
}