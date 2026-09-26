/* ============================================================
   EDUVILLE 2.0 — VIDEOS.JS
   Videos library with filter + search
   ============================================================ */

const videosClient = window.db;

let allVideos = [];
let selectedCourse = 'all';
let searchQuery = '';

function extractYouTubeId(url) {
  if (!url) return null;
  let m = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  m = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  m = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  return null;
}

// ============================================================
// LOAD VIDEOS
// ============================================================

async function loadVideos() {
  const grid = document.getElementById('videos-grid');
  if (!grid) return;

  try {
    const { data, error } = await videosClient
      .from('videos')
      .select('*');

    if (error) throw error;

    allVideos = data || [];
    renderVideos();
  } catch (error) {
    console.error('Videos error:', error);
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">⚠️</div>
        <h3>Could not load videos</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// ============================================================
// RENDER VIDEOS
// ============================================================

function renderVideos() {
  const grid = document.getElementById('videos-grid');
  const count = document.getElementById('videos-count');
  const heading = document.getElementById('videos-heading');
  if (!grid) return;

  let filtered = allVideos;

  if (selectedCourse !== 'all') {
    filtered = filtered.filter(v => v.course === selectedCourse);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(v =>
      (v.title || '').toLowerCase().includes(q) ||
      (v.course || '').toLowerCase().includes(q)
    );
  }

  if (heading) heading.textContent = selectedCourse === 'all' ? 'All Videos' : selectedCourse;
  if (count) count.textContent = filtered.length + (filtered.length === 1 ? ' video' : ' videos');

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">🎬</div>
        <h3>No videos yet</h3>
        <p>Video lessons will appear here once teachers publish them.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = '';
  filtered.forEach((video) => {
    const ytId = extractYouTubeId(video.embed_url || video.original_url || video.url);
    const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : '';

    const card = document.createElement('a');
    card.className = 'video-card';
    card.href = `video.html?id=${video.id}`;

    card.innerHTML = `
      <div class="video-thumb">
        ${thumb ? `<img src="${thumb}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;">` : ''}
        <div class="video-play-icon">▶</div>
        ${video.duration ? `<div class="video-duration">${escapeHtml(video.duration)}</div>` : ''}
      </div>
      <div class="video-body">
        <h3 class="video-title">${escapeHtml(video.title || 'Untitled')}</h3>
        <div class="video-meta-row">
          <span class="video-course-badge">📘 ${escapeHtml(video.course || 'General')}</span>
        </div>
        <div class="video-author">👤 ${escapeHtml(video.author || 'EduVille')}</div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// ============================================================
// FILTER
// ============================================================

function filterByCourse(course, btn) {
  selectedCourse = course;
  const bar = document.getElementById('filter-bar');
  if (bar) {
    bar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    if (btn) btn.classList.add('active');
  }
  renderVideos();
}

// ============================================================
// SEARCH
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('video-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderVideos();
    });
  }
});

// ============================================================
// PAGE LOAD
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  loadVideos();
});
