/* ============================================================
   EDUVILLE 2.0 — NOTES.JS
   Study notes = published lessons with written content,
   grouped by course.
   ============================================================ */

const notesClient = window.db;

let allNotes = [];
let activeSubject = 'all';
let noteQuery = '';

// ============================================================
// LOAD
// ============================================================

async function loadNotes() {
  const list = document.getElementById('notes-list');
  if (!list) return;

  try {
    const { data, error } = await notesClient
      .from('lessons')
      .select('id, title, order_index, duration_minutes, course_id, courses(id, title, icon_emoji, subject, level, exam_board)')
      .eq('is_published', true)
      .not('content_markdown', 'is', null)
      .order('order_index', { ascending: true });

    if (error) throw error;

    allNotes = data || [];
    buildSubjectChips();
    renderNotes();
  } catch (error) {
    console.error('Notes error:', error);
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠</div>
        <h3>Could not load notes</h3>
        <p>${escapeHtml(error.message)}</p>
      </div>`;
    const count = document.getElementById('notes-count');
    if (count) count.textContent = '';
  }
}

// ============================================================
// FILTER CHIPS
// ============================================================

function buildSubjectChips() {
  const bar = document.getElementById('subject-filters');
  if (!bar) return;

  const subjects = [...new Set(
    allNotes.map(n => n.courses && n.courses.subject).filter(Boolean)
  )].sort();

  bar.innerHTML = '';
  ['all', ...subjects].forEach((subject) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'notes-chip' + (subject === activeSubject ? ' active' : '');
    chip.textContent = subject === 'all' ? 'All subjects' : subject;
    chip.addEventListener('click', () => {
      activeSubject = subject;
      bar.querySelectorAll('.notes-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderNotes();
    });
    bar.appendChild(chip);
  });
}

// ============================================================
// RENDER
// ============================================================

function renderNotes() {
  const list = document.getElementById('notes-list');
  const count = document.getElementById('notes-count');
  const heading = document.getElementById('notes-heading');
  if (!list) return;

  let rows = allNotes;

  if (activeSubject !== 'all') {
    rows = rows.filter(n => n.courses && n.courses.subject === activeSubject);
  }
  if (noteQuery) {
    const q = noteQuery.toLowerCase();
    rows = rows.filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      ((n.courses && n.courses.title) || '').toLowerCase().includes(q)
    );
  }

  if (heading) heading.textContent = activeSubject === 'all' ? 'All Notes' : activeSubject;
  if (count) count.textContent = rows.length + (rows.length === 1 ? ' note' : ' notes');

  if (rows.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <h3>No notes found</h3>
        <p>${allNotes.length === 0 ? 'Notes will appear here once teachers publish lessons.' : 'Try a different subject or search.'}</p>
      </div>`;
    return;
  }

  // Group by course
  const groups = new Map();
  rows.forEach((n) => {
    const key = n.courses ? n.courses.id : 'other';
    if (!groups.has(key)) groups.set(key, { course: n.courses || null, lessons: [] });
    groups.get(key).lessons.push(n);
  });

  const ordered = [...groups.values()].sort((a, b) =>
    ((a.course && a.course.title) || '~').localeCompare((b.course && b.course.title) || '~')
  );

  list.innerHTML = ordered.map((g) => {
    const c = g.course;
    const boardClass = !c ? 'tag'
      : c.exam_board === 'ZIMSEC' ? 'tag-zimsec'
      : c.exam_board === 'Cambridge' ? 'tag-cambridge'
      : c.exam_board === 'BEC' ? 'tag-bec' : 'tag';

    const head = c
      ? `<div class="notes-group-head">
           <div class="notes-group-emoji">${escapeHtml(c.icon_emoji || '📘')}</div>
           <div>
             <h3 class="notes-group-title">${escapeHtml(c.title)}</h3>
             <div class="notes-group-tags">
               <span class="tag ${boardClass}">${escapeHtml(c.exam_board)}</span>
               <span class="tag">${escapeHtml(c.level)}</span>
               <span class="tag">${escapeHtml(c.subject)}</span>
             </div>
           </div>
         </div>`
      : `<div class="notes-group-head">
           <div class="notes-group-emoji">📘</div>
           <div><h3 class="notes-group-title">Other lessons</h3></div>
         </div>`;

    const items = g.lessons.map((n, i) => `
      <a class="note-row" href="lesson.html?id=${encodeURIComponent(n.id)}">
        <span class="note-num">${String(i + 1).padStart(2, '0')}</span>
        <span class="note-title">${escapeHtml(n.title)}</span>
        <span class="note-meta">${n.duration_minutes ? escapeHtml(n.duration_minutes) + ' min' : 'Read'}</span>
      </a>`).join('');

    return `<div class="notes-group">${head}${items}</div>`;
  }).join('');
}

// ============================================================
// PAGE LOAD
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();

  const search = document.getElementById('notes-search');
  if (search) {
    search.addEventListener('input', (e) => {
      noteQuery = e.target.value.trim();
      renderNotes();
    });
  }

  loadNotes();
});