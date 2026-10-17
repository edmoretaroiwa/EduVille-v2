/* ============================================================
   EDUVILLE — VIDEOS.JS  (fast version)
   - loads only 12 videos at a time (server-side paging)
   - filter + search run on the server, so it stays fast with thousands of videos
   - skeleton placeholders, lazy thumbnails, instant repeat visits (cached first page)
   ============================================================ */
const videosClient = window.db;
const PAGE = 12;
const COLS = 'id,title,course,author,duration,embed_url,original_url,created_at';

let selectedCourse = 'all', searchQuery = '', offset = 0, total = null, loading = false, done = false, runId = 0, searchTimer = null;

function extractYouTubeId(url) {
  if (!url) return null;
  var m = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/) || url.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ||
          url.match(/youtube(?:-nocookie)?\.com\/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}
function cleanTerm(q) { return q.replace(/[,()%*\\"'`;:<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60); }

function skeletons(n) {
  var h = '';
  for (var i = 0; i < n; i++) h += '<div class="sk-card sk-item"><div class="sk-thumb"></div><div class="sk-line"></div><div class="sk-line short"></div></div>';
  return h;
}

function cardFor(video) {
  var ytId = extractYouTubeId(video.embed_url || video.original_url);
  var card = document.createElement('a');
  card.className = 'video-card';
  card.href = 'video.html?id=' + encodeURIComponent(video.id);
  card.innerHTML =
    '<div class="video-thumb">' +
      (ytId ? '<img src="' + ytThumb(ytId) + '" alt="" width="320" height="180" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;">' : '') +
      '<div class="video-play-icon">▶</div>' +
      (video.duration ? '<div class="video-duration">' + escapeHtml(video.duration) + '</div>' : '') +
    '</div>' +
    '<div class="video-body">' +
      '<h3 class="video-title">' + escapeHtml(video.title || 'Untitled') + '</h3>' +
      '<div class="video-meta-row"><span class="video-course-badge">📘 ' + escapeHtml(video.course || 'General') + '</span></div>' +
      '<div class="video-author">👤 ' + escapeHtml(video.author || 'EduVille') + '</div>' +
    '</div>';
  return card;
}

function moreWrap() {
  var w = document.getElementById('videos-more');
  if (!w) {
    var grid = document.getElementById('videos-grid');
    w = document.createElement('div'); w.id = 'videos-more'; w.className = 'load-more-wrap';
    w.innerHTML = '<button type="button" class="load-more-btn">Load more videos</button>';
    grid.parentNode.insertBefore(w, grid.nextSibling);
    w.querySelector('button').addEventListener('click', function () { loadPage(false); });
  }
  return w;
}

function updateHeader() {
  var heading = document.getElementById('videos-heading'), count = document.getElementById('videos-count');
  if (heading) heading.textContent = selectedCourse === 'all' ? 'All Videos' : selectedCourse;
  if (count && total !== null) count.textContent = total + (total === 1 ? ' video' : ' videos');
}

function cacheKey() { return 'vids:' + selectedCourse + ':' + searchQuery; }

async function loadPage(reset) {
  if (loading || (done && !reset)) return;
  var grid = document.getElementById('videos-grid'); if (!grid) return;
  var wrap = moreWrap(), btn = wrap.querySelector('button');
  loading = true; var my = ++runId;
  if (reset) {
    offset = 0; done = false; total = null;
    // show cached first page instantly (stale-while-revalidate) when there is one
    var cached = null;
    try { cached = JSON.parse(sessionStorage.getItem(cacheKey()) || 'null'); } catch (e) {}
    grid.innerHTML = '';
    if (cached && cached.rows) { cached.rows.forEach(function (v) { grid.appendChild(cardFor(v)); }); total = cached.total; updateHeader(); }
    else grid.insertAdjacentHTML('beforeend', skeletons(PAGE));
  } else {
    grid.insertAdjacentHTML('beforeend', skeletons(4));
  }
  btn.disabled = true; btn.textContent = 'Loading…';

  try {
    var q = videosClient.from('videos').select(COLS, { count: 'exact' });
    if (selectedCourse !== 'all') q = q.eq('course', selectedCourse);
    if (searchQuery) { var like = '%' + searchQuery + '%'; q = q.or('title.ilike.' + like + ',course.ilike.' + like); }
    var res = await q.order('created_at', { ascending: false }).range(offset, offset + PAGE - 1);
    if (my !== runId) return; // a newer request replaced this one
    if (res.error) throw res.error;
    var rows = res.data || [];
    total = res.count != null ? res.count : total;
    grid.querySelectorAll('.sk-item').forEach(function (n) { n.remove(); });
    if (reset) grid.innerHTML = ''; // drop cached cards, replace with fresh data
    rows.forEach(function (v) { grid.appendChild(cardFor(v)); });
    if (reset && offset === 0) { try { sessionStorage.setItem(cacheKey(), JSON.stringify({ rows: rows, total: total })); } catch (e) {} }
    offset += rows.length;
    done = rows.length < PAGE || (total !== null && offset >= total);
    updateHeader();
    if (!grid.children.length) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">🎬</div><h3>' +
        (searchQuery ? 'No videos match “' + escapeHtml(searchQuery) + '”' : 'No videos yet') + '</h3><p>' +
        (searchQuery ? 'Try a different word.' : 'Video lessons will appear here once teachers publish them.') + '</p></div>';
    }
    wrap.style.display = done ? 'none' : 'flex';
    btn.disabled = false; btn.textContent = 'Load more videos';
  } catch (error) {
    if (my !== runId) return;
    console.error('Videos error:', error);
    grid.querySelectorAll('.sk-item').forEach(function (n) { n.remove(); });
    if (reset) grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">⚠️</div><h3>Could not load videos</h3><p>Check your connection and try again.</p></div>';
    btn.disabled = false; btn.textContent = 'Try again';
  } finally { if (my === runId) loading = false; }
}

function filterByCourse(course, btn) {
  selectedCourse = course;
  var bar = document.getElementById('filter-bar');
  if (bar) { bar.querySelectorAll('.filter-chip').forEach(function (c) { c.classList.remove('active'); }); if (btn) btn.classList.add('active'); }
  loading = false; loadPage(true);
}

document.addEventListener('DOMContentLoaded', function () {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  var s = document.getElementById('video-search');
  if (s) s.addEventListener('input', function (e) {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () { searchQuery = cleanTerm(e.target.value); loading = false; loadPage(true); }, 300);
  });
  loadPage(true);
  // auto-load the next page when the student scrolls near the bottom
  if ('IntersectionObserver' in window) {
    var sentinel = document.createElement('div'); sentinel.style.height = '1px';
    moreWrap().appendChild(sentinel);
    new IntersectionObserver(function (en) { if (en[0].isIntersecting && !loading && !done && offset > 0) loadPage(false); }, { rootMargin: '400px' }).observe(sentinel);
  }
});
