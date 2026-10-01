/* ============================================================
   EDUVILLE 2.0 — TEACHER-DASHBOARD.JS
   Teachers see/edit/delete their own videos and papers.
   ============================================================ */

const teacherClient = window.db;

let myVideos = [];
let myPapers = [];
let myUserId = null;
let myRole = null;

// ============================================================
// LOAD
// ============================================================

async function initTeacherDashboard() {
  const root = document.getElementById('teacher-content');
  if (!root) return;

  try {
    const { session, role } = await getMyRole();

    if (!session) { root.innerHTML = accessGateHtml('login'); return; }
    if (!isTeacherRole(role)) { root.innerHTML = accessGateHtml('teacher'); return; }

    myUserId = session.user.id;
    myRole = role;

    // Load videos authored by me
    const { data: videos, error: vErr } = await teacherClient
      .from('videos')
      .select('*')
      .eq('author_id', myUserId)
      .order('created_at', { ascending: false });

    if (vErr) throw vErr;
    myVideos = videos || [];

    // Load papers authored by me
    const { data: papers, error: pErr } = await teacherClient
      .from('papers')
      .select('*')
      .eq('author_id', myUserId)
      .order('created_at', { ascending: false });

    if (pErr) throw pErr;
    myPapers = papers || [];

    renderDashboard(root);
  } catch (error) {
    console.error('Teacher dashboard error:', error);
    root.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠</div>
        <h3>Could not load your dashboard</h3>
        <p>${escapeHtml(error.message)}</p>
        <a href="index.html" class="btn btn-gold">Back to Home</a>
      </div>`;
  }
}

// ============================================================
// RENDER
// ============================================================

function renderDashboard(root) {
  root.innerHTML = `
    <div class="stats-grid">
      <div class="dash-stat">
        <div class="dash-stat-icon">🎬</div>
        <div class="dash-stat-value">${myVideos.length}</div>
        <div class="dash-stat-label">Videos</div>
      </div>
      <div class="dash-stat">
        <div class="dash-stat-icon">📄</div>
        <div class="dash-stat-value">${myPapers.length}</div>
        <div class="dash-stat-label">Papers</div>
      </div>
      <div class="dash-stat">
        <div class="dash-stat-icon">🎓</div>
        <div class="dash-stat-value">${escapeHtml(myRole)}</div>
        <div class="dash-stat-label">Role</div>
      </div>
    </div>

    <div class="profile-links" style="margin-bottom:1.5rem;">
      <a href="add-video.html" class="btn btn-gold btn-sm">+ Add Video</a>
      <a href="add-paper.html" class="btn btn-gold btn-sm">+ Add Past Paper</a>
    </div>

    <section>
      <div class="section-heading-row">
        <h2 class="section-heading">🎬 My Videos</h2>
        <span class="text-muted">${myVideos.length} total</span>
      </div>
      <div id="td-videos">${renderVideoList()}</div>
    </section>

    <section style="margin-top:2rem;">
      <div class="section-heading-row">
        <h2 class="section-heading">📄 My Past Papers</h2>
        <span class="text-muted">${myPapers.length} total</span>
      </div>
      <div id="td-papers">${renderPaperList()}</div>
    </section>
  `;

  wireActions(root);
}

function renderVideoList() {
  if (myVideos.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">🎬</div>
        <h3>No videos yet</h3>
        <p>Share your first lesson with students.</p>
        <a href="add-video.html" class="btn btn-gold">+ Add a Video</a>
      </div>`;
  }

  return myVideos.map((v) => `
    <div class="td-row" data-type="video" data-id="${escapeHtml(v.id)}">
      <div class="td-main">
        <div class="td-icon">🎬</div>
        <div class="td-info">
          <h4>${escapeHtml(v.title || 'Untitled')}</h4>
          <p>${escapeHtml(v.course || 'General')}${v.duration ? ' · ' + escapeHtml(v.duration) : ''}</p>
        </div>
      </div>
      <div class="td-actions">
        <a href="video.html?id=${encodeURIComponent(v.id)}" class="btn btn-ghost btn-sm" target="_blank" rel="noopener">View</a>
        <button type="button" class="btn btn-ghost btn-sm" data-action="edit" data-type="video" data-id="${escapeHtml(v.id)}">Edit</button>
        <button type="button" class="btn btn-ghost btn-sm td-danger" data-action="delete" data-type="video" data-id="${escapeHtml(v.id)}">Delete</button>
      </div>
    </div>
  `).join('');
}

function renderPaperList() {
  if (myPapers.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">📄</div>
        <h3>No papers yet</h3>
        <p>Add a past paper to the library.</p>
        <a href="add-paper.html" class="btn btn-gold">+ Add a Paper</a>
      </div>`;
  }

  return myPapers.map((p) => `
    <div class="td-row" data-type="paper" data-id="${escapeHtml(p.id)}">
      <div class="td-main">
        <div class="td-icon">📄</div>
        <div class="td-info">
          <h4>${escapeHtml(p.title || 'Untitled')}</h4>
          <p>${escapeHtml(p.exam_board || '')} · ${escapeHtml(p.level || '')} · ${escapeHtml(p.subject || '')}${p.year ? ' · ' + escapeHtml(p.year) : ''}${p.paper_type ? ' · ' + escapeHtml(p.paper_type) : ''}</p>
        </div>
      </div>
      <div class="td-actions">
        <a href="${escapeHtml(safeUrl(p.file_url))}" class="btn btn-ghost btn-sm" target="_blank" rel="noopener">Open</a>
        <button type="button" class="btn btn-ghost btn-sm" data-action="edit" data-type="paper" data-id="${escapeHtml(p.id)}">Edit</button>
        <button type="button" class="btn btn-ghost btn-sm td-danger" data-action="delete" data-type="paper" data-id="${escapeHtml(p.id)}">Delete</button>
      </div>
    </div>
  `).join('');
}

// ============================================================
// ACTIONS — edit / delete
// ============================================================

function wireActions(root) {
  root.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.type, btn.dataset.id));
  });

  root.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => handleDelete(btn.dataset.type, btn.dataset.id));
  });
}

async function handleDelete(type, id) {
  const label = type === 'video' ? 'video' : 'paper';
  if (!confirm(`Delete this ${label}? This cannot be undone.`)) return;

  try {
    const table = type === 'video' ? 'videos' : 'papers';
    const { error } = await teacherClient.from(table).delete().eq('id', id);
    if (error) throw error;

    if (type === 'video') {
      myVideos = myVideos.filter(v => v.id !== id);
    } else {
      myPapers = myPapers.filter(p => p.id !== id);
    }
    renderDashboard(document.getElementById('teacher-content'));
  } catch (error) {
    console.error('Delete error:', error);
    alert('Could not delete: ' + error.message);
  }
}

// ============================================================
// EDIT MODAL
// ============================================================

function openEditModal(type, id) {
  const item = type === 'video'
    ? myVideos.find(v => v.id === id)
    : myPapers.find(p => p.id === id);

  if (!item) return;

  const isVideo = type === 'video';

  // Build the fields
  const fieldsHtml = isVideo ? videoFields(item) : paperFields(item);

  const modal = document.createElement('div');
  modal.className = 'td-modal-backdrop';
  modal.innerHTML = `
    <div class="td-modal" role="dialog" aria-modal="true">
      <div class="td-modal-head">
        <h3>Edit ${isVideo ? 'video' : 'paper'}</h3>
        <button type="button" class="td-modal-close" aria-label="Close">✕</button>
      </div>
      <div class="form-msg" id="td-modal-msg" role="status"></div>
      <form id="td-modal-form">
        ${fieldsHtml}
        <div class="form-actions" style="justify-content:flex-end;">
          <button type="button" class="btn btn-ghost" data-close>Cancel</button>
          <button type="submit" class="btn btn-gold" id="td-modal-save">Save changes</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  const close = () => {
    modal.remove();
    document.body.style.overflow = '';
  };

  modal.querySelector('.td-modal-close').addEventListener('click', close);
  modal.querySelector('[data-close]').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  modal.querySelector('#td-modal-form').addEventListener('submit', (e) =>
    saveEdit(e, type, id, close)
  );

  if (typeof lucide !== 'undefined') lucide.createIcons();
  const firstInput = modal.querySelector('input, select, textarea');
  if (firstInput) firstInput.focus();
}

function videoFields(v) {
  return `
    <div class="form-group">
      <label for="td-title">Title</label>
      <input type="text" id="td-title" maxlength="120" value="${escapeHtml(v.title || '')}" required>
    </div>
    <div class="form-group">
      <label for="td-course">Subject</label>
      <select id="td-course" class="form-select">
        ${['Mathematics','Physics','Chemistry','Biology','Computer Studies']
          .map(s => `<option ${v.course === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label for="td-duration">Length</label>
      <input type="text" id="td-duration" maxlength="8" value="${escapeHtml(v.duration || '')}" placeholder="12:30">
    </div>
    <div class="form-group">
      <label for="td-author">Presenter name</label>
      <input type="text" id="td-author" maxlength="80" value="${escapeHtml(v.author || '')}" required>
    </div>
  `;
}

function paperFields(p) {
  return `
    <div class="form-group">
      <label for="td-title">Title</label>
      <input type="text" id="td-title" maxlength="140" value="${escapeHtml(p.title || '')}" required>
    </div>
    <div class="form-grid">
      <div class="form-group">
        <label for="td-board">Exam board</label>
        <select id="td-board" class="form-select">
          ${['ZIMSEC','BEC','Cambridge'].map(b =>
            `<option ${p.exam_board === b ? 'selected' : ''}>${b}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label for="td-level">Level</label>
        <select id="td-level" class="form-select">
          ${['O-Level','A-Level','IGCSE','AS','A2'].map(l =>
            `<option ${p.level === l ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label for="td-subject">Subject</label>
        <input type="text" id="td-subject" maxlength="60" value="${escapeHtml(p.subject || '')}" required>
      </div>
      <div class="form-group">
        <label for="td-year">Year</label>
        <input type="number" id="td-year" min="1990" max="${new Date().getFullYear() + 1}" value="${escapeHtml(p.year || '')}" required>
      </div>
      <div class="form-group">
        <label for="td-paper-type">Paper type</label>
        <select id="td-paper-type" class="form-select">
          ${['Paper 1','Paper 2','Paper 3','Practical','Marking Scheme'].map(t =>
            `<option ${p.paper_type === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label for="td-file">PDF link or path</label>
      <input type="text" id="td-file" maxlength="500" value="${escapeHtml(p.file_url || '')}" required>
    </div>
  `;
}

async function saveEdit(event, type, id, close) {
  event.preventDefault();
  const msgBox = document.getElementById('td-modal-msg');
  const showMsg = (kind, text) => {
    msgBox.className = 'form-msg show ' + kind;
    msgBox.textContent = text;
  };

  const btn = document.getElementById('td-modal-save');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const table = type === 'video' ? 'videos' : 'papers';
    let patch;

    if (type === 'video') {
      const title = document.getElementById('td-title').value.trim();
      const course = document.getElementById('td-course').value;
      const duration = document.getElementById('td-duration').value.trim();
      const author = document.getElementById('td-author').value.trim();

      if (title.length < 3) throw new Error('Title is too short.');
      if (author.length < 2) throw new Error('Presenter name is required.');
      if (duration && !/^\d{1,2}(:\d{2}){1,2}$/.test(duration)) {
        throw new Error('Length must look like 12:30.');
      }

      patch = { title, course, duration: duration || null, author };
    } else {
      const title = document.getElementById('td-title').value.trim();
      const board = document.getElementById('td-board').value;
      const level = document.getElementById('td-level').value;
      const subject = document.getElementById('td-subject').value.trim();
      const year = Number(document.getElementById('td-year').value);
      const paperType = document.getElementById('td-paper-type').value;
      const fileUrl = document.getElementById('td-file').value.trim();

      if (title.length < 3) throw new Error('Title is too short.');
      if (subject.length < 2) throw new Error('Subject is required.');
      if (!Number.isInteger(year) || year < 1990 || year > new Date().getFullYear() + 1) {
        throw new Error('Year is not valid.');
      }
      if (!fileUrl) throw new Error('File link is required.');

      patch = {
        title, exam_board: board, level, subject,
        year, paper_type: paperType, file_url: fileUrl
      };
    }

    const { error } = await teacherClient.from(table).update(patch).eq('id', id);
    if (error) throw error;

    // Refresh local copy
    const list = type === 'video' ? myVideos : myPapers;
    const idx = list.findIndex(x => x.id === id);
    if (idx >= 0) list[idx] = { ...list[idx], ...patch };

    close();
    renderDashboard(document.getElementById('teacher-content'));
  } catch (error) {
    console.error('Edit save error:', error);
    showMsg('error', error.message || 'Could not save.');
    btn.disabled = false;
    btn.textContent = 'Save changes';
  }
}

// ============================================================
// PAGE LOAD
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  initTeacherDashboard();
});