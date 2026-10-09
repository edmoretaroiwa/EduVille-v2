/* ============================================================
   EDUVILLE 2.0 — APP.JS
   The MAIN client. Creates window.db for all other files.
   ============================================================ */

// Guard: if the Supabase SDK failed to load, don't crash the page.
let db = null;
if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
  console.error('⚠️ Supabase SDK not loaded — data features will not work.');
} else if (typeof EDUVILLE_CONFIG === 'undefined') {
  console.error('⚠️ EDUVILLE_CONFIG not loaded — check config.js.');
} else {
  try {
    const { createClient } = window.supabase;
    db = createClient(
      EDUVILLE_CONFIG.SUPABASE_URL,
      EDUVILLE_CONFIG.SUPABASE_ANON_KEY
    );
    window.db = db;
  } catch (err) {
    console.error('⚠️ Failed to create Supabase client:', err);
  }
}

// ============================================================
// UTILITIES
// ============================================================

function $(selector) {
  return document.querySelector(selector);
}

function $$(selector) {
  return document.querySelectorAll(selector);
}

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(url) {
  try {
    const u = new URL(url, window.location.origin);
    return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : '#';
  } catch (e) {
    return '#';
  }
}

function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ============================================================
// LOAD HOMEPAGE STATS
// ============================================================

async function loadRealStats() {
  if (!window.db) return;

  const statStudents = document.getElementById('stat-students');
  const statCourses = document.getElementById('stat-courses');
  const statLessons = document.getElementById('stat-lessons');
  const statPapers = document.getElementById('stat-papers');

  if (!statStudents && !statCourses && !statLessons && !statPapers) return;

  try {
    const [users, courses, lessons, papers] = await Promise.all([
      window.db.from('users').select('*', { count: 'exact', head: true }),
      window.db.from('courses').select('*', { count: 'exact', head: true }),
      window.db.from('lessons').select('*', { count: 'exact', head: true }),
      window.db.from('papers').select('*', { count: 'exact', head: true })
    ]);

    if (statStudents) statStudents.textContent = (users.count || 0) + '+';
    if (statCourses) statCourses.textContent = (courses.count || 0) + '+';
    if (statLessons) statLessons.textContent = (lessons.count || 0) + '+';
    if (statPapers) statPapers.textContent = (papers.count || 0) + '+';
  } catch (e) {
    console.log('Stats error (OK):', e);
  }
}

// ============================================================
// LOAD HOMEPAGE VIDEOS
// ============================================================

async function loadHomepageVideos() {
  if (!window.db) return;

  const container = document.getElementById('latest-videos');
  if (!container) return;

  try {
    const { data, error } = await window.db
      .from('videos')
      .select('*')
      .limit(3);

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">🎬</div>
          <h3>No videos yet</h3>
          <p>Video lessons will appear here once teachers start publishing.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    data.forEach((video) => {
      const card = document.createElement('a');
      card.className = 'repo-card';
      card.href = 'videos.html';
      card.innerHTML = `
        <div class="repo-header">
          <div class="repo-icon">▶</div>
          <h3 class="repo-title">${escapeHtml(video.title || 'Untitled')}</h3>
        </div>
        <p class="repo-desc">${escapeHtml(video.course || 'General')} · ${escapeHtml(video.duration || '')}</p>
        <div class="repo-footer">
          <span>👤 ${escapeHtml(video.author || 'Unknown')}</span>
        </div>
        <span class="btn btn-gold btn-sm">▶ Watch</span>
      `;
      container.appendChild(card);
    });
  } catch (error) {
    console.error('Videos error:', error);
  }
}

// ============================================================
// PWA — service worker + manifest (relative paths for safety)
// ============================================================

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    // Resolve relative to the current page — works on both root
    // domain AND on subpath hosting like github.io/repo/
    try {
      const swUrl = new URL('service-worker.js', window.location.href);
      // Scope must be the directory the SW lives in
      const scope = new URL('.', swUrl).pathname;
      navigator.serviceWorker.register(swUrl.toString(), { scope })
        .then((reg) => console.log('✅ Service worker registered:', reg.scope))
        .catch((err) => console.warn('Service worker registration failed:', err));
    } catch (err) {
      console.warn('Service worker registration error:', err);
    }
  });
}

(function injectManifest() {
  if (document.querySelector('link[rel="manifest"]')) return;

  try {
    const manifestUrl = new URL('manifest.json', window.location.href).href;

    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = manifestUrl;
    document.head.appendChild(link);

    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
      const apple = document.createElement('link');
      apple.rel = 'apple-touch-icon';
      apple.href = new URL('assets/images/logo-icon.png', window.location.href).href;
      document.head.appendChild(apple);
    }

    if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
      const meta = document.createElement('meta');
      meta.name = 'apple-mobile-web-app-capable';
      meta.content = 'yes';
      document.head.appendChild(meta);

      const statusBar = document.createElement('meta');
      statusBar.name = 'apple-mobile-web-app-status-bar-style';
      statusBar.content = 'black-translucent';
      document.head.appendChild(statusBar);
    }
  } catch (err) {
    console.warn('Manifest injection error:', err);
  }
})();

// ============================================================
// PAGE LOAD
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  loadRealStats();
  loadHomepageVideos();
});

console.log('🚀 EduVille 2.0 loaded');