/* ============================================================
   EDUVILLE 2.0 — SERVICE WORKER
   ============================================================ */

const VERSION = 'eduville-v1.0.2';
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

// Determine the base path from the SW's own URL.
// On eduvillelearning.africa/ this is "/".
// On edmoretaroiwa.github.io/EduVille-/ this is "/EduVille-/".
const BASE = new URL('./', self.location.href).pathname;

const PRECACHE_URLS = [
  BASE + '',
  BASE + 'index.html',
  BASE + 'courses.html',
  BASE + 'mathematics.html',
  BASE + 'physics.html',
  BASE + 'chemistry.html',
  BASE + 'biology.html',
  BASE + 'computer-studies.html',
  BASE + 'ai-tutor.html',
  BASE + 'about.html',
  BASE + 'contact.html',
  BASE + 'offline.html',
  BASE + 'assets/css/main.css',
  BASE + 'assets/css/components.css',
  BASE + 'assets/css/layout.css',
  BASE + 'assets/css/extra.css',
  BASE + 'assets/js/config.js',
  BASE + 'assets/js/app.js',
  BASE + 'assets/js/auth.js',
  BASE + 'assets/images/favicon.svg',
  BASE + 'assets/images/logo-full.png',
  BASE + 'assets/images/logo-icon.png',
  BASE + 'assets/images/hero-bg.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] Skipping (not cached):', url, err.message);
          })
        )
      ))
      .then(() => self.skipWaiting())
  );
});

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

self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  if (url.hostname.endsWith('supabase.co')) return;
  if (url.hostname.includes('googleapis.com')) return;
  if (url.hostname.includes('gstatic.com')) return;
  if (url.hostname.includes('youtube.com')) return;
  if (url.hostname.includes('ytimg.com')) return;
  if (url.hostname.includes('unpkg.com')) return;
  if (url.hostname.includes('jsdelivr.net')) return;

  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) =>
            cached || caches.match(BASE + 'offline.html') || caches.match(BASE + 'index.html')
          )
        )
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
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

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});