/* ============================================================
   EDUVILLE 2.0 — VIDEOS.JS
   Loads all videos from Supabase with filter + search
   ============================================================ */

const { createClient } = supabase;
const videosClient = createClient(
  EDUVILLE_CONFIG.SUPABASE_URL,
  EDUVILLE_CONFIG.SUPABASE_ANON_KEY
);

let allVideos = [];
let currentFilter = 'all';
let currentQuery = '';

// ============================================================
// HELPERS
// ============================================================

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function extractYouTubeId(url) {
  if (!url) return null;
  let match = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  match = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  match = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  return null;
}

function getYouTubeThumbnail(video) {
  // Try embed_url, original_url, then any url field
  const id = extractYouTubeId(video.embed_url || video.original_url || video.url);
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
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
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    allVideos = data || [];
    renderVideos();
    updateAddButton();

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

  // Filter
  let filtered = allVideos;
  if (currentFilter !== 'all') {
    filtered = filtered.filter(v => v.course === currentFilter);
  }
  if (currentQuery) {
    const q = currentQuery.toLowerCase();
    filtered = filtered.filter(v =>
      (v.title || '').toLowerCase().includes(q) ||
      (v.course || '').toLowerCase().includes(q) ||
      (v.author || '').toLowerCase().includes(q)
    );
  }

  // Update heading + count
  if (heading) heading.textContent = currentFilter === 'all' ? 'All Videos' : currentFilter;
  if (count) count.textContent = filtered.length + (filtered.length === 1 ? ' video' : ' videos');

  // Empty state
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">🎬</div>
        <h3>No videos yet</h3>
        <p>Video lessons will appear here once teachers start publishing.</p>
      </div>
    `;
    return;
  }

  // Render
  grid.innerHTML = '';
  filtered.forEach((video) => {
    const card = document.createElement('a');
    card.className = 'video-card';
    card.href = `video.html?id=${video.id}`;

    const thumb = getYouTubeThumbnail(video);
    const thumbHtml = thumb
      ? `<img src="${thumb}" alt="${escapeHtml(video.title)}" loading="lazy">`
      : '';

    const duration = video.duration || '';

    card.innerHTML = `
      <div class="video-thumb">
        ${thumbHtml}
        <div class="video-play-icon">▶</div>
        ${duration ? `<div class="video-duration">${escapeHtml(duration)}</div>` : ''}
      </div>
      <div class="video-body">
        <h3 class="video-title">${escapeHtml(video.title || 'Untitled')}</h3>
        <div class="video-meta-row">
          <span class="video-course-badge">📘 ${escapeHtml(video.course || 'General')}</span>
        </div>
        <div class="video-author">
          👤 ${escapeHtml(video.author || 'EduVille')}
        </div>
      </div>
    `;

    grid.appendChild(card);
  });
}

// ============================================================
// FILTERS
// ============================================================

function filterByCourse(course, btn) {
  currentFilter = course;
  const bar = document.getElementById('filter-bar');
  bar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderVideos();
}

// ============================================================
// SEARCH
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('video-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentQuery = e.target.value.trim();
      renderVideos();
    });
  }
});

// ============================================================
// SHOW "+ ADD VIDEO" BUTTON IF LOGGED IN
// ============================================================

async function updateAddButton() {
  const btn = document.getElementById('add-video-btn');
  if (!btn) return;

  const { data: { session } } = await videosClient.auth.getSession();
  if (session) {
    btn.style.display = 'inline-flex';
  }
}

// ============================================================
// PAGE LOAD
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  loadVideos();
});
