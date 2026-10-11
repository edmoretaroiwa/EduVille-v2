/* ============================================================
   EDUVILLE 2.0 — SERVICE WORKER
   Caches the app shell so students can use EduVille offline.
   ============================================================ */

const VERSION = 'eduville-v1.0.0';
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

// Pages + assets we cache on install (the "app shell")
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/courses.html',
  '/mathematics.html',
  '/physics.html',
  '/chemistry.html',
  '/biology.html',
  '/computer-studies.html',
  '/ai-tutor.html',
  '/about.html',
  '/contact.html',
  '/offline.html',

  // CSS
  '/assets/css/main.css',
  '/assets/css/components.css',
  '/assets/css/layout.css',
  '/assets/css/extra.css',

  // JS core (avoid caching data-heavy scripts like courses.js — they query Supabase)
  '/assets/js/config.js',
  '/assets/js/app.js',
  '/assets/js/auth.js',

  // Images
  '/assets/images/favicon.svg',
  '/assets/images/logo-full.png',
  '/assets/images/logo-icon.png',
  '/assets/images/hero-bg.png'
];

// ---------- INSTALL ----------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => {
        // addAll fails the whole install if any single file 404s.
        // We use individual adds so a missing file doesn't break everything.
        return Promise.all(
          PRECACHE_URLS.map((url) =>
            cache.add(url).catch((err) => {
              console.warn('[SW] Skipping (not cached):', url, err.message);
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// ---------- ACTIVATE ----------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ---------- FETCH ----------
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET. Never cache POST/PUT/etc.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never cache Supabase API calls — always live
  if (url.hostname.endsWith('supabase.co')) return;

  // Never cache Google Fonts, YouTube, etc. — let browser handle them
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('youtube.com') ||
    url.hostname.includes('ytimg.com') ||
    url.hostname.includes('unpkg.com') ||
    url.hostname.includes('jsdelivr.net')
  ) {
    return;
  }

  // Same-origin requests only (your own pages + assets)
  if (url.origin !== self.location.origin) return;

  // Navigation requests (page loads): network first, fall back to cache, then offline page
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Cache successful HTML responses
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) =>
            cached || caches.match('/offline.html') || caches.match('/index.html')
          )
        )
    );
    return;
  }

  // Static assets (CSS, JS, images): cache first, then network
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        // Refresh in background (stale-while-revalidate)
        fetch(req).then((res) => {
          if (res && res.status === 200) {
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, res.clone()));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      });
    })
  );
});

// ---------- MESSAGE (allow manual refresh of cache) ----------
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});