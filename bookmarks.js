/* ============================================================
   EDUVILLE 2.0 — BOOKMARKS.JS
   Shared helpers for save/unsave + the bookmarks list page
   ============================================================ */

const bookmarksClient = window.db;

// ============================================================
// LOW-LEVEL HELPERS
// ============================================================

async function isBookmarked(itemType, itemId) {
  try {
    const { data: { session } } = await bookmarksClient.auth.getSession();
    if (!session) return false;

    const { data } = await bookmarksClient
      .from('bookmarks')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('item_type', itemType)
      .eq('item_id', itemId)
      .maybeSingle();

    return !!data;
  } catch (e) {
    return false;
  }
}

async function addBookmark(itemType, itemId) {
  const { data: { session } } = await bookmarksClient.auth.getSession();
  if (!session) throw new Error('Please log in to save items.');

  const { error } = await bookmarksClient
    .from('bookmarks')
    .upsert(
      { user_id: session.user.id, item_type: itemType, item_id: itemId },
      { onConflict: 'user_id,item_type,item_id' }
    );

  if (error) throw error;
}

async function removeBookmark(itemType, itemId) {
  const { data: { session } } = await bookmarksClient.auth.getSession();
  if (!session) throw new Error('Please log in to remove saved items.');

  const { error } = await bookmarksClient
    .from('bookmarks')
    .delete()
    .eq('user_id', session.user.id)
    .eq('item_type', itemType)
    .eq('item_id', itemId);

  if (error) throw error;
}

// ============================================================
// TOGGLE BUTTON (used on lesson/video/paper pages)
// ============================================================

/**
 * Renders a bookmark toggle button into a container and wires it up.
 * @param {string} containerId  - id of the element that will hold the button
 * @param {string} itemType     - 'lesson' | 'video' | 'paper'
 * @param {string} itemId       - the row id
 */
async function mountBookmarkButton(containerId, itemType, itemId) {
  const host = document.getElementById(containerId);
  if (!host || !itemId) return;

  const { data: { session } } = await bookmarksClient.auth.getSession();
  if (!session) {
    // Not logged in — show a button that prompts login
    host.innerHTML = `
      <button type="button" class="bookmark-btn" data-state="logged-out">
        <span class="bm-icon">🤍</span>
        <span class="bm-label">Save</span>
      </button>
    `;
    host.querySelector('button').addEventListener('click', () => {
      if (confirm('Log in to save this to your bookmarks. Go to login?')) {
        window.location.href = 'login.html';
      }
    });
    return;
  }

  const saved = await isBookmarked(itemType, itemId);
  renderBookmarkButton(host, itemType, itemId, saved);
}

function renderBookmarkButton(host, itemType, itemId, saved) {
  host.innerHTML = `
    <button type="button" class="bookmark-btn ${saved ? 'saved' : ''}"
            aria-pressed="${saved}" aria-label="${saved ? 'Remove from bookmarks' : 'Save to bookmarks'}">
      <span class="bm-icon">${saved ? '❤️' : '🤍'}</span>
      <span class="bm-label">${saved ? 'Saved' : 'Save'}</span>
    </button>
  `;

  host.querySelector('button').addEventListener('click', async (event) => {
    const btn = event.currentTarget;
    btn.disabled = true;
    try {
      if (btn.classList.contains('saved')) {
        await removeBookmark(itemType, itemId);
        renderBookmarkButton(host, itemType, itemId, false);
      } else {
        await addBookmark(itemType, itemId);
        renderBookmarkButton(host, itemType, itemId, true);
      }
    } catch (error) {
      console.error('Bookmark toggle error:', error);
      alert(error.message || 'Could not update your bookmark.');
      btn.disabled = false;
    }
  });
}

// ============================================================
// BOOKMARKS LIST PAGE
// ============================================================

let allBookmarks = [];
let activeType = 'all';
let bookmarksMeta = { lessons: {}, videos: {}, papers: {} };

async function loadBookmarksPage() {
  const root = document.getElementById('bookmarks-content');
  if (!root) return;

  try {
    const { data: { session } } = await bookmarksClient.auth.getSession();
    if (!session) {
      root.innerHTML = accessGateHtml('login');
      return;
    }

    // 1. Load the bookmarks
    const { data: marks, error } = await bookmarksClient
      .from('bookmarks')
      .select('id, item_type, item_id, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    allBookmarks = marks || [];

    if (allBookmarks.length === 0) {
      root.innerHTML = emptyBookmarksHtml();
      return;
    }

    // 2. Split by type and fetch the referenced rows in parallel
    const lessonIds = allBookmarks.filter(m => m.item_type === 'lesson').map(m => m.item_id);
    const videoIds  = allBookmarks.filter(m => m.item_type === 'video').map(m => m.item_id);
    const paperIds  = allBookmarks.filter(m => m.item_type === 'paper').map(m => m.item_id);

    const [lessonsRes, videosRes, papersRes] = await Promise.all([
      lessonIds.length
        ? bookmarksClient.from('lessons').select('id, title, duration_minutes, course_id').in('id', lessonIds)
        : Promise.resolve({ data: [] }),
      videoIds.length
        ? bookmarksClient.from('videos').select('id, title, course, duration, author').in('id', videoIds)
        : Promise.resolve({ data: [] }),
      paperIds.length
        ? bookmarksClient.from('papers').select('id, title, exam_board, level, subject, year, file_url').in('id', paperIds)
        : Promise.resolve({ data: [] })
    ]);

    // Also load course info for lessons so we can show subject tags
    const lessonCourseIds = [...new Set((lessonsRes.data || []).map(l => l.course_id).filter(Boolean))];
    let lessonCourses = [];
    if (lessonCourseIds.length) {
      const { data: c } = await bookmarksClient
        .from('courses')
        .select('id, title, icon_emoji, subject, level, exam_board')
        .in('id', lessonCourseIds);
      lessonCourses = c || [];
    }
    const courseMap = new Map(lessonCourses.map(c => [c.id, c]));

    // 3. Build lookup maps
    bookmarksMeta.lessons = {};
    (lessonsRes.data || []).forEach(l => {
      bookmarksMeta.lessons[l.id] = { ...l, course: courseMap.get(l.course_id) || null };
    });
    bookmarksMeta.videos = {};
    (videosRes.data || []).forEach(v => { bookmarksMeta.videos[v.id] = v; });
    bookmarksMeta.papers = {};
    (papersRes.data || []).forEach(p => { bookmarksMeta.papers[p.id] = p; });

    renderBookmarksPage(root);
  } catch (error) {
    console.error('Bookmarks page error:', error);
    root.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠</div>
        <h3>Could not load your bookmarks</h3>
        <p>${escapeHtml(error.message)}</p>
        <a href="index.html" class="btn btn-gold">Back to Home</a>
      </div>`;
  }
}

function emptyBookmarksHtml() {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">🔖</div>
      <h3>No bookmarks yet</h3>
      <p>Tap the "Save" button on any lesson, video, or past paper to keep it here.</p>
      <div class="profile-links" style="justify-content:center;">
        <a href="courses.html" class="btn btn-gold btn-sm">Browse Courses</a>
        <a href="videos.html" class="btn btn-ghost btn-sm">Browse Videos</a>
        <a href="resources.html" class="btn btn-ghost btn-sm">Browse Papers</a>
      </div>
    </div>`;
}

function renderBookmarksPage(root) {
  const filtered = activeType === 'all'
    ? allBookmarks
    : allBookmarks.filter(b => b.item_type === activeType);

  const tabsHtml = `
    <div class="bm-tabs" role="tablist">
      ${tab('all',    'All',     allBookmarks.length)}
      ${tab('lesson', 'Lessons', allBookmarks.filter(b => b.item_type === 'lesson').length)}
      ${tab('video',  'Videos',  allBookmarks.filter(b => b.item_type === 'video').length)}
      ${tab('paper',  'Papers',  allBookmarks.filter(b => b.item_type === 'paper').length)}
    </div>
  `;

  const bodyHtml = filtered.length === 0
    ? `<p class="form-note" style="text-align:center; padding:1.5rem 0;">Nothing saved in this category yet.</p>`
    : `<div class="bm-grid">${filtered.map(renderBookmarkCard).join('')}</div>`;

  root.innerHTML = tabsHtml + bodyHtml;

  // Wire up tab clicks
  root.querySelectorAll('.bm-tab').forEach(el => {
    el.addEventListener('click', () => {
      activeType = el.dataset.type;
      renderBookmarksPage(root);
    });
  });

  // Wire up remove buttons
  root.querySelectorAll('[data-remove-bm]').forEach(btn => {
    btn.addEventListener('click', async (event) => {
      const { type, id } = event.currentTarget.dataset;
      if (!confirm('Remove this bookmark?')) return;

      try {
        await removeBookmark(type, id);
        allBookmarks = allBookmarks.filter(b => !(b.item_type === type && b.item_id === id));
        renderBookmarksPage(root);
      } catch (error) {
        alert('Could not remove: ' + error.message);
      }
    });
  });
}

function tab(key, label, count) {
  return `
    <button type="button" role="tab"
            class="bm-tab ${activeType === key ? 'active' : ''}"
            data-type="${key}">
      ${escapeHtml(label)}
      <span class="bm-tab-count">${count}</span>
    </button>`;
}

function renderBookmarkCard(b) {
  if (b.item_type === 'lesson') {
    const l = bookmarksMeta.lessons[b.item_id];
    if (!l) return missingCard('Lesson');
    const c = l.course;
    return `
      <div class="bm-card">
        <a href="lesson.html?id=${encodeURIComponent(l.id)}" class="bm-card-main">
          <div class="bm-icon">${escapeHtml((c && c.icon_emoji) || '📘')}</div>
          <div class="bm-info">
            <h4>${escapeHtml(l.title)}</h4>
            <p>${escapeHtml((c && c.title) || 'Lesson')}${l.duration_minutes ? ' · ' + escapeHtml(l.duration_minutes) + ' min' : ''}</p>
          </div>
        </a>
        <button type="button" class="bm-remove" data-remove-bm data-type="lesson" data-id="${escapeHtml(l.id)}" aria-label="Remove">✕</button>
      </div>`;
  }

  if (b.item_type === 'video') {
    const v = bookmarksMeta.videos[b.item_id];
    if (!v) return missingCard('Video');
    return `
      <div class="bm-card">
        <a href="video.html?id=${encodeURIComponent(v.id)}" class="bm-card-main">
          <div class="bm-icon">🎬</div>
          <div class="bm-info">
            <h4>${escapeHtml(v.title || 'Video')}</h4>
            <p>${escapeHtml(v.course || 'General')}${v.duration ? ' · ' + escapeHtml(v.duration) : ''}</p>
          </div>
        </a>
        <button type="button" class="bm-remove" data-remove-bm data-type="video" data-id="${escapeHtml(v.id)}" aria-label="Remove">✕</button>
      </div>`;
  }

  if (b.item_type === 'paper') {
    const p = bookmarksMeta.papers[b.item_id];
    if (!p) return missingCard('Paper');
    return `
      <div class="bm-card">
        <a href="${escapeHtml(safeUrl(p.file_url))}" target="_blank" rel="noopener" class="bm-card-main">
          <div class="bm-icon">📄</div>
          <div class="bm-info">
            <h4>${escapeHtml(p.title || 'Paper')}</h4>
            <p>${escapeHtml(p.exam_board || '')} · ${escapeHtml(p.level || '')} · ${escapeHtml(p.subject || '')}${p.year ? ' · ' + escapeHtml(p.year) : ''}</p>
          </div>
        </a>
        <button type="button" class="bm-remove" data-remove-bm data-type="paper" data-id="${escapeHtml(p.id)}" aria-label="Remove">✕</button>
      </div>`;
  }

  return missingCard('Item');
}

function missingCard(kind) {
  return `
    <div class="bm-card bm-card-missing">
      <div class="bm-card-main">
        <div class="bm-icon">⚠</div>
        <div class="bm-info">
          <h4>${escapeHtml(kind)} no longer available</h4>
          <p>It may have been removed.</p>
        </div>
      </div>
    </div>`;
}

// ============================================================
// PAGE LOAD
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  if (document.getElementById('bookmarks-content')) {
    loadBookmarksPage();
  }
});