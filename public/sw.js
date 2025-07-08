// Service Worker Simplificado para TAS COOPE Terminal
const CACHE_NAME = 'tas-coope-assets-v1.0.0';

// Solo cachear assets estáticos básicos
const STATIC_ASSETS = ['/LOGO.png', '/QR-COOPE.gif', '/manifest.json'];

// Instalación
self.addEventListener('install', (event) => {
    console.log('🔧 SW: Instalando...');

    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .then(() => {
                console.log('✅ SW: Assets cacheados');
                return self.skipWaiting();
            })
            .catch((error) => console.error('❌ SW: Error:', error))
    );
});

// Activación
self.addEventListener('activate', (event) => {
    console.log('🚀 SW: Activando...');

    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => cacheName !== CACHE_NAME)
                        .map((cacheName) => caches.delete(cacheName))
                );
            })
            .then(() => {
                console.log('✅ SW: Activado');
                return self.clients.claim();
            })
    );
});

// Fetch - Solo para assets estáticos
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Solo interceptar assets estáticos de nuestro dominio
    if (
        url.origin === self.location.origin &&
        event.request.method === 'GET' &&
        /\.(png|jpg|jpeg|gif|svg|ico|webp|json)$/i.test(url.pathname)
    ) {
        event.respondWith(
            caches.match(event.request).then((response) => {
                if (response) {
                    return response;
                }

                return fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseToCache = networkResponse.clone();
                        caches
                            .open(CACHE_NAME)
                            .then((cache) =>
                                cache.put(event.request, responseToCache)
                            );
                    }
                    return networkResponse;
                });
            })
        );
    }

    // Para todo lo demás (APIs, páginas): directo a la red
});

console.log('🔧 Service Worker TAS COOPE cargado');
