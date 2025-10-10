/**
 * Enhanced Service Worker for caching and offline functionality
 */
const CACHE_NAME = 'feedback-system-v2';
const STATIC_CACHE = 'static-v2';
const DYNAMIC_CACHE = 'dynamic-v2';
const IMAGE_CACHE = 'images-v2';
const API_CACHE = 'api-v2';

// Cache size limits
const CACHE_LIMITS = {
  [STATIC_CACHE]: 50 * 1024 * 1024, // 50MB
  [DYNAMIC_CACHE]: 100 * 1024 * 1024, // 100MB
  [IMAGE_CACHE]: 200 * 1024 * 1024, // 200MB
  [API_CACHE]: 50 * 1024 * 1024, // 50MB
};

// Files to cache on install
const STATIC_FILES = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico',
  '/offline.html',
];

// API endpoints to cache with TTL
const API_CACHE_CONFIG = {
  '/api/v1/auth/verify-token': { ttl: 300000, strategy: 'cache-first' }, // 5 minutes
  '/api/v1/students': { ttl: 600000, strategy: 'stale-while-revalidate' }, // 10 minutes
  '/api/v1/faculty': { ttl: 600000, strategy: 'stale-while-revalidate' }, // 10 minutes
  '/api/v1/feedback/analytics': { ttl: 300000, strategy: 'cache-first' }, // 5 minutes
  '/api/v1/dashboard/stats': { ttl: 120000, strategy: 'stale-while-revalidate' }, // 2 minutes
};

// Image optimization settings
const IMAGE_OPTIMIZATION = {
  maxWidth: 800,
  maxHeight: 600,
  quality: 0.8,
  formats: ['webp', 'jpeg', 'png']
};

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_FILES)),
      caches.open(IMAGE_CACHE),
      caches.open(API_CACHE),
      caches.open(DYNAMIC_CACHE)
    ])
    .then(() => {
      console.log('All caches initialized successfully');
      return self.skipWaiting();
    })
    .catch((error) => {
      console.error('Failed to initialize caches:', error);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!Object.values(CACHE_LIMITS).includes(cacheName)) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim()
    ])
    .then(() => {
      console.log('Service Worker activated');
      // Start cache cleanup
      cleanupCaches();
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
  } else if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request));
  } else if (url.origin === location.origin) {
    event.respondWith(handleStaticRequest(request));
  } else {
    event.respondWith(handleExternalRequest(request));
  }
});

// Handle API requests with intelligent caching
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const config = API_CACHE_CONFIG[url.pathname];
  
  if (!config) {
    return fetch(request);
  }

  try {
    const cache = await caches.open(API_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse && !isExpired(cachedResponse, config.ttl)) {
      // Return cached response and update in background
      if (config.strategy === 'stale-while-revalidate') {
        updateCacheInBackground(request, cache);
      }
      return cachedResponse;
    }

    // Fetch from network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      responseToCache.headers.set('sw-cached-at', Date.now().toString());
      cache.put(request, responseToCache);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('API request failed:', error);
    
    // Return cached response if available
    const cache = await caches.open(API_CACHE);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Handle image requests with optimization
async function handleImageRequest(request) {
  try {
    const cache = await caches.open(IMAGE_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Optimize image if needed
      const optimizedResponse = await optimizeImage(networkResponse);
      cache.put(request, optimizedResponse.clone());
      return optimizedResponse;
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Image request failed:', error);
    throw error;
  }
}

// Handle static file requests
async function handleStaticRequest(request) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Static request failed:', error);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlineResponse = await caches.match('/offline.html');
      if (offlineResponse) {
        return offlineResponse;
      }
    }
    
    throw error;
  }
}

// Handle external requests
async function handleExternalRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('External request failed:', error);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Check if request is for an image
function isImageRequest(request) {
  return request.destination === 'image' || 
         /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(request.url);
}

// Check if cached response is expired
function isExpired(response, ttl) {
  const cachedAt = response.headers.get('sw-cached-at');
  if (!cachedAt) return true;
  
  const age = Date.now() - parseInt(cachedAt);
  return age > ttl;
}

// Update cache in background
async function updateCacheInBackground(request, cache) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      responseToCache.headers.set('sw-cached-at', Date.now().toString());
      cache.put(request, responseToCache);
    }
  } catch (error) {
    console.error('Background cache update failed:', error);
  }
}

// Optimize images
async function optimizeImage(response) {
  try {
    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);
    
    // Create canvas for optimization
    const canvas = new OffscreenCanvas(
      Math.min(imageBitmap.width, IMAGE_OPTIMIZATION.maxWidth),
      Math.min(imageBitmap.height, IMAGE_OPTIMIZATION.maxHeight)
    );
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);
    
    // Convert to optimized format
    const optimizedBlob = await canvas.convertToBlob({
      type: 'image/webp',
      quality: IMAGE_OPTIMIZATION.quality
    });
    
    return new Response(optimizedBlob, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  } catch (error) {
    console.error('Image optimization failed:', error);
    return response;
  }
}

// Clean up caches periodically
async function cleanupCaches() {
  const cacheNames = Object.keys(CACHE_LIMITS);
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    if (keys.length > 100) { // Arbitrary limit
      // Remove oldest entries
      const sortedKeys = keys.sort((a, b) => {
        const aTime = a.headers.get('sw-cached-at') || '0';
        const bTime = b.headers.get('sw-cached-at') || '0';
        return parseInt(aTime) - parseInt(bTime);
      });
      
      const keysToDelete = sortedKeys.slice(0, keys.length - 100);
      await Promise.all(keysToDelete.map(key => cache.delete(key)));
    }
  }
}

// Handle background sync
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'feedback-sync') {
    event.waitUntil(syncFeedbackData());
  } else if (event.tag === 'cache-cleanup') {
    event.waitUntil(cleanupCaches());
  }
});

// Sync feedback data when back online
async function syncFeedbackData() {
  try {
    const pendingFeedback = await getPendingFeedback();
    
    for (const feedback of pendingFeedback) {
      try {
        const response = await fetch('/api/v1/feedback/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${feedback.token}`,
          },
          body: JSON.stringify(feedback.data),
        });
        
        if (response.ok) {
          await removePendingFeedback(feedback.id);
          console.log('Feedback synced successfully:', feedback.id);
        }
      } catch (error) {
        console.error('Failed to sync feedback:', feedback.id, error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Helper functions for IndexedDB operations
async function getPendingFeedback() {
  return [];
}

async function removePendingFeedback(id) {
  console.log('Removing pending feedback:', id);
}

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View',
        icon: '/favicon.ico'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/favicon.ico'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Feedback System', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Periodic cache cleanup
setInterval(cleanupCaches, 24 * 60 * 60 * 1000); // Daily cleanup
