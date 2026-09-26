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

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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
  const statsRow = document.querySelector('.stats-row');
  if (!statsRow) return;

  try {
    const { count: userCount } = await db.from('users').select('*', { count: 'exact', head: true });
    const { count: courseCount } = await db.from('courses').select('*', { count: 'exact', head: true });
    const { count: lessonCount } = await db.from('lessons').select('*', { count: 'exact', head: true });
    const { count: paperCount } = await db.from('papers').select('*', { count: 'exact', head: true });

    const statVals = document.querySelectorAll('.mini-stat h3');
    if (statVals[0]) statVals[0].textContent = (userCount || 0) + '+';
    if (statVals[1]) statVals[1].textContent = (courseCount || 0) + '+';
    if (statVals[2]) statVals[2].textContent = (lessonCount || 0) + '+';
    if (statVals[3]) statVals[3].textContent = (paperCount || 0) + '+';
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
