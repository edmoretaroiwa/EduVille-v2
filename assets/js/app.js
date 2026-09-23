/* ============================================================
   EDUVILLE 2.0 — APP.JS
   Main app logic — Supabase client, stats, shared helpers
   ============================================================ */

// ============================================================
// 1. SUPABASE CLIENT
// ============================================================

const { createClient } = supabase;
const db = createClient(
  EDUVILLE_CONFIG.SUPABASE_URL,
  EDUVILLE_CONFIG.SUPABASE_ANON_KEY
);

// Make available globally
window.db = db;

// ============================================================
// 2. UTILITIES
// ============================================================

function $(selector) {
  return document.querySelector(selector);
}

function $$(selector) {
  return document.querySelectorAll(selector);
}

function show(el) {
  if (el) el.style.display = '';
}

function hide(el) {
  if (el) el.style.display = 'none';
}

function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// ============================================================
// 3. LOAD STATS (homepage)
// ============================================================

async function loadStats() {
  const statStudents = document.getElementById('stat-students');
  const statCourses = document.getElementById('stat-courses');
  const statLessons = document.getElementById('stat-lessons');
  const statPapers = document.getElementById('stat-papers');

  if (!statStudents) return; // not on homepage

  try {
    // Count users
    const { count: userCount } = await db
      .from('users')
      .select('*', { count: 'exact', head: true });
    if (statStudents) statStudents.textContent = (userCount || 0) + '';

    // Count courses
    const { count: courseCount } = await db
      .from('courses')
      .select('*', { count: 'exact', head: true });
    if (statCourses) statCourses.textContent = (courseCount || 0) + '';

    // Count lessons
    const { count: lessonCount } = await db
      .from('lessons')
      .select('*', { count: 'exact', head: true });
    if (statLessons) statLessons.textContent = (lessonCount || 0) + '';

    // Count papers
    const { count: paperCount } = await db
      .from('papers')
      .select('*', { count: 'exact', head: true });
    if (statPapers) statPapers.textContent = (paperCount || 0) + '';
  } catch (error) {
    console.error('Stats error:', error);
  }
}

// ============================================================
// 4. LOAD LATEST VIDEOS (homepage)
// ============================================================

async function loadLatestVideos() {
  const container = document.getElementById('latest-videos');
  if (!container) return;

  try {
    const { data, error } = await db
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false })
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
      const card = document.createElement('div');
      card.className = 'repo-card';
      card.innerHTML = `
        <div class="repo-header">
          <div class="repo-icon">▶</div>
          <h3 class="repo-title">${video.title || 'Untitled'}</h3>
        </div>
        <p class="repo-desc">${video.course || 'General'} · ${video.duration || ''}</p>
        <div class="repo-footer">
          <span>📘 ${video.course || 'General'}</span>
          <span>👤 ${video.author || 'Unknown'}</span>
        </div>
        <a href="video.html?id=${video.id}" class="btn btn-gold btn-sm">▶ Watch</a>
      `;
      container.appendChild(card);
    });
  } catch (error) {
    console.error('Videos error:', error);
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">⚠️</div>
        <h3>Could not load videos</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// ============================================================
// 5. PAGE LOADER
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons FIRST
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // Then load data
  loadStats();
  loadLatestVideos();
});

// ============================================================
// 6. DEBUG INFO (log to console)
// ============================================================

console.log('🚀 EduVille 2.0 loaded');
console.log('Supabase URL:', EDUVILLE_CONFIG.SUPABASE_URL);
console.log('Environment:', EDUVILLE_CONFIG.ENV);
