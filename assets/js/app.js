/* ============================================================
   EDUVILLE 2.0 — APP.JS
   The MAIN client. Creates window.db for all other files.
   ============================================================ */

// Create the single Supabase client
const { createClient } = supabase;
const db = createClient(
  EDUVILLE_CONFIG.SUPABASE_URL,
  EDUVILLE_CONFIG.SUPABASE_ANON_KEY
);

// Make it globally available to ALL other scripts
window.db = db;

// ============================================================
// UTILITIES
// ============================================================

function $(selector) {
  return document.querySelector(selector);
}

function $$(selector) {
  return document.querySelectorAll(selector);
}

// Escapes text for safe use inside HTML text AND quoted attributes.
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')

    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Only allows http/https links. Blocks javascript:, data:, etc.
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
// Matches the .stat-card .stat-value markup in index.html
// ============================================================

async function loadRealStats() {
  const statStudents = document.getElementById('stat-students');
  const statCourses = document.getElementById('stat-courses');
  const statLessons = document.getElementById('stat-lessons');
  const statPapers = document.getElementById('stat-papers');

  // Bail early if we're not on the homepage
  if (!statStudents && !statCourses && !statLessons && !statPapers) return;

  try {
    const [users, courses, lessons, papers] = await Promise.all([
      db.from('users').select('*', { count: 'exact', head: true }),
      db.from('courses').select('*', { count: 'exact', head: true }),
      db.from('lessons').select('*', { count: 'exact', head: true }),
      db.from('papers').select('*', { count: 'exact', head: true })
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
  const container = document.getElementById('latest-videos');
  if (!container) return;

  try {
    const { data, error } = await db
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
      card.href = `videos.html`;
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
// PAGE LOAD
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  loadRealStats();
  loadHomepageVideos();
});

console.log('🚀 EduVille 2.0 loaded');