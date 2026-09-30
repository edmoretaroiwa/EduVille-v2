/* ============================================================
   EDUVILLE 2.0 — VIDEO.JS
   Single video player page
   ============================================================ */

const videoClient = window.db;

function getVideoId() {
  return new URLSearchParams(window.location.search).get('id');
}

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

async function loadVideo() {
  const videoId = getVideoId();
  const playerEl = document.getElementById('video-player');
  const infoEl = document.getElementById('video-info-block');
  const breadcrumbEl = document.getElementById('breadcrumb-current');

  if (!videoId) {
    showNotFound('No video specified.');
    return;
  }

  try {
    const { data: video, error } = await videoClient
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (error || !video) {
      showNotFound('Video not found.');
      return;
    }

    document.title = (video.title || 'Video') + ' — EduVille';

    if (breadcrumbEl) breadcrumbEl.textContent = video.title || 'Video';

    const rawUrl = video.embed_url || video.original_url || '';
const ytId = extractYouTubeId(rawUrl);
const embedUrl = ytId ? safeUrl(`https://www.youtube.com/embed/${ytId}`) : null;

    if (embedUrl) {
      playerEl.innerHTML = `
        <div class="video-frame-wrapper">
          <iframe
            src="${embedUrl}"
            title="${escapeHtml(video.title || 'Video')}"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen></iframe>
        </div>
      `;
    } else {
      playerEl.innerHTML = `
        <div class="empty-state" style="margin-bottom: 1.5rem;">
          <div class="empty-state-icon">📹</div>
          <h3>Video unavailable</h3>
          <p>No valid YouTube URL for this video.</p>
        </div>
      `;
    }

    const meta = [];
    if (video.course) meta.push(`📘 ${escapeHtml(video.course)}`);
    if (video.duration) meta.push(`⏱️ ${escapeHtml(video.duration)}`);
    if (video.author) meta.push(`👤 ${escapeHtml(video.author)}`);
    if (video.created_at) meta.push(`📅 ${escapeHtml(formatDate(video.created_at))}`);

    infoEl.innerHTML = `
      <div class="video-info">
        <h1>${escapeHtml(video.title || 'Untitled Video')}</h1>
        <div class="video-meta-row">
          ${meta.map(m => `<span class="meta-item">${m}</span>`).join('')}
        </div>
      </div>

      ${video.description ? `
        <div class="video-description">
          <h3>📝 About this lesson</h3>
          <p>${escapeHtml(video.description)}</p>
        </div>
      ` : ''}

      <div class="video-actions" style="display:flex; gap:0.6rem; flex-wrap:wrap;">
  <div id="bookmark-slot" style="min-width:140px; flex:0 0 auto;"></div>
  <a href="videos.html" class="btn btn-secondary">
    <i data-lucide="arrow-left" style="width:14px;height:14px;"></i>
    All Videos
  </a>
</div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  } catch (error) {
    console.error('Video error:', error);
    showNotFound(error.message);
  }
}

function showNotFound(message) {
  document.getElementById('video-player').innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">❌</div>
      <h3>Video not found</h3>
      <p>${escapeHtml(message)}</p>
      <a href="videos.html" class="btn btn-gold">Browse All Videos</a>
    </div>
  `;
  document.getElementById('video-info-block').innerHTML = '';
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  loadVideo();
});