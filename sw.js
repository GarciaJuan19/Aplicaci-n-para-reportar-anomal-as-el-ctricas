const CACHE_NAME = 'fallocero-v2'; // 👈 subí la versión para limpiar el cache anterior

const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/menu.html',
  '/mapa.html',
  '/mis-reportes.html',
  '/perfil.html',
  '/perfil-admin.html', // ✅ corregido
  '/registro.html',
  '/recuperarPassword.html',
  '/admin/index.html',
  '/admin/mapa-admin.html',
  '/css/style.css',
  '/js/firebase-config.js',
  '/js/login.js',
  '/js/menu.js',
  '/js/mapa.js',
  '/js/mis-reportes.js',
  '/js/perfil.js',
  '/js/recuperar.js',
  '/js/registro.js',
  '/js/reportar.js',
  '/js/admin/mapa-admin.js',
  '/js/admin/perfil-admin.js', // ✅ corregido
  '/js/admin.js',
  '/img/Logo3.png'
];

// ================================================
// INSTALL — cachear archivos
// ================================================
self.addEventListener('install', event => {
  self.skipWaiting(); // Toma control inmediatamente
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      const promises = urlsToCache.map(url =>
        cache.add(url).catch(err => console.warn('⚠️ No se pudo cachear:', url, err))
      );
      return Promise.all(promises);
    })
  );
});

// ================================================
// ACTIVATE — limpiar caches viejos
// ================================================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Eliminando cache viejo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => clients.claim()) // Toma control de todas las pestañas
  );
});

// ================================================
// FETCH — red primero, cache como respaldo
// ================================================
self.addEventListener('fetch', event => {
  // Ignorar peticiones que no sean GET
  if (event.request.method !== 'GET') return;

  // Ignorar peticiones de Firebase y externos (no cachear)
  const url = event.request.url;
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('firebase') ||
    url.includes('gstatic.com') ||
    url.includes('googleapis.com')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Guardar copia fresca en cache
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Sin conexión — usar cache
        return caches.match(event.request);
      })
  );
});