// Spanish Menu Cheater PWA - Service Worker
// Provides offline functionality for complete app experience

const CACHE_NAME = 'spanish-menu-cheater-v1.0.0';
const DATA_CACHE_NAME = 'spanish-menu-data-v1.0.0';

// Define all resources needed for offline functionality
const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/styles/main.css',
  '/styles/components.css',
  '/js/main.js',
  '/js/dataManager.js',
  '/js/searchEngine.js'
];

// Critical data files for offline search functionality
const DATA_FILES = [
  '/data/spanish_menu_items.csv'
];

// External resources with fallback handling
const EXTERNAL_RESOURCES = [
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=Cormorant+Garamond:wght@400;500;600&display=swap'
];

// Install event - cache all essential resources
self.addEventListener('install', event => {
  console.log('[SW] Install event');
  
  event.waitUntil(
    Promise.all([
      // Cache app shell resources
      caches.open(CACHE_NAME).then(cache => {
        console.log('[SW] Caching app shell');
        return cache.addAll(APP_SHELL_FILES);
      }),
      // Cache critical data
      caches.open(DATA_CACHE_NAME).then(cache => {
        console.log('[SW] Caching menu data');
        return cache.addAll(DATA_FILES);
      }),
      // Cache external resources with error handling
      caches.open(CACHE_NAME).then(cache => {
        console.log('[SW] Caching external resources');
        return Promise.allSettled(
          EXTERNAL_RESOURCES.map(url => 
            fetch(url).then(response => {
              if (response.ok) {
                return cache.put(url, response);
              }
            }).catch(err => {
              console.warn('[SW] Failed to cache external resource:', url, err);
            })
          )
        );
      })
    ]).then(() => {
      console.log('[SW] All resources cached successfully');
      // Force activation of new service worker
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete old caches
          if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Old caches cleaned up');
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - serve cached content with intelligent fallback
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle different types of requests with appropriate strategies
  
  // Data files (CSV) - Cache First for offline functionality
  if (DATA_FILES.some(file => request.url.includes(file))) {
    event.respondWith(
      caches.match(request).then(response => {
        if (response) {
          console.log('[SW] Serving cached data:', request.url);
          return response;
        }
        
        // If not in cache, fetch and cache
        return fetch(request).then(response => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(DATA_CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        }).catch(() => {
          console.error('[SW] Failed to fetch critical data:', request.url);
          // Return a basic error response for data files
          return new Response(
            JSON.stringify({ error: 'Offline - data unavailable' }),
            { 
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/json' }
            }
          );
        });
      })
    );
    return;
  }
  
  // App shell resources - Cache First
  if (APP_SHELL_FILES.some(file => request.url.endsWith(file) || file === '/')) {
    event.respondWith(
      caches.match(request).then(response => {
        if (response) {
          console.log('[SW] Serving cached app shell:', request.url);
          return response;
        }
        
        // If not in cache, fetch and cache
        return fetch(request).then(response => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        }).catch(() => {
          // For HTML requests, serve the main page
          if (request.headers.get('accept').includes('text/html')) {
            return caches.match('/index.html');
          }
          
          console.error('[SW] Failed to fetch app shell resource:', request.url);
          return new Response('Resource unavailable offline', { 
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
    );
    return;
  }
  
  // External resources (Google Fonts) - Network First with Cache Fallback
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          // Cache successful responses
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Fallback to cache if network fails
        return caches.match(request).then(response => {
          if (response) {
            console.log('[SW] Serving cached font:', request.url);
            return response;
          }
          
          // If font not cached, continue without font
          console.warn('[SW] Font not available offline:', request.url);
          return new Response('', { status: 200 });
        });
      })
    );
    return;
  }
  
  // All other requests - Network First with Cache Fallback
  event.respondWith(
    fetch(request).then(response => {
      // Cache successful GET requests
      if (response.ok && request.method === 'GET') {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, responseClone);
        });
      }
      return response;
    }).catch(() => {
      // Try to serve from cache
      return caches.match(request).then(response => {
        if (response) {
          console.log('[SW] Serving cached resource:', request.url);
          return response;
        }
        
        // If HTML request and not cached, serve main page
        if (request.headers.get('accept').includes('text/html')) {
          return caches.match('/index.html');
        }
        
        // For other resources, return service unavailable
        return new Response('Resource unavailable offline', { 
          status: 503,
          statusText: 'Service Unavailable'
        });
      });
    })
  );
});

// Handle background sync for potential future features
self.addEventListener('sync', event => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'update-data') {
    event.waitUntil(
      // Future: sync updated menu data when online
      Promise.resolve()
    );
  }
});

// Handle push notifications for potential future features
self.addEventListener('push', event => {
  console.log('[SW] Push event received');
  
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'New Spanish menu items available!',
      icon: '/icons/android-chrome-192x192.png',
      badge: '/icons/favicon-32x32.png',
      tag: 'menu-update',
      requireInteraction: true
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Spanish Menu Cheater', options)
    );
  }
});

// Message handling for communication with main app
self.addEventListener('message', event => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'CHECK_OFFLINE_READY') {
    // Check if all critical resources are cached
    Promise.all([
      caches.match('/index.html'),
      caches.match('/data/spanish_menu_items.csv'),
      caches.match('/js/main.js')
    ]).then(responses => {
      const isOfflineReady = responses.every(response => response !== undefined);
      
      event.ports[0].postMessage({
        type: 'OFFLINE_READY_STATUS',
        isReady: isOfflineReady
      });
    });
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skip waiting requested');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CHECK_VERSION') {
    // Send back current version
    event.ports[0].postMessage({
      type: 'VERSION_INFO',
      version: CACHE_NAME,
      dataVersion: DATA_CACHE_NAME
    });
  }
});

// Error handling
self.addEventListener('error', event => {
  console.error('[SW] Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
  event.preventDefault();
});

console.log('[SW] Service Worker loaded successfully');