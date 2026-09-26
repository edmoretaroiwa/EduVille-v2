/* ============================================================
   EDUVILLE 2.0 — RESOURCES.JS
   Past papers library
   ============================================================ */

const papersClient = window.db;

let allPapers = [];
let filterBoard = 'all';
let selectedLevel = 'all';
let paperQuery = '';

function getBoardClass(board) {
  if (board === 'ZIMSEC') return 'tag-zimsec';
  if (board === 'Cambridge') return 'tag-cambridge';
  if (board === 'BEC') return 'tag-bec';
  return 'tag';
}

// ============================================================
// LOAD PAPERS
// ============================================================

async function loadPapers() {
  const grid = document.getElementById('papers-grid');
  if (!grid) return;

  try {
    const { data, error } = await papersClient
      .from('papers')
      .select('*');

    if (error) throw error;

    allPapers = data || [];
    renderPapers();
  } catch (error) {
    console.error('Papers error:', error);
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">⚠️</div>
        <h3>Could not load papers</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// ============================================================
// RENDER PAPERS
// ============================================================

function renderPapers() {
  const grid = document.getElementById('papers-grid');
  const count = document.getElementById('papers-count');
  const heading = document.getElementById('papers-heading');
  if (!grid) return;

  let filtered = allPapers;

  if (filterBoard !== 'all') {
    filtered = filtered.filter(p => p.exam_board === filterBoard);
  }
  if (selectedLevel !== 'all') {
    filtered = filtered.filter(p => p.level === selectedLevel);
  }
  if (paperQuery) {
    const q = paperQuery.toLowerCase();
    filtered = filtered.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.subject || '').toLowerCase().includes(q)
    );
  }

  if (heading) {
    if (filterBoard === 'all' && selectedLevel === 'all') {
      heading.textContent = 'All Papers';
    } else {
      heading.textContent = [filterBoard, selectedLevel]
        .filter(f => f !== 'all')
        .join(' · ');
    }
  }
  if (count) count.textContent = filtered.length + (filtered.length === 1 ? ' paper' : ' papers');

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">📭</div>
        <h3>No papers yet</h3>
        <p>Past papers will appear here once uploaded.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = '';
  filtered.forEach((paper) => {
    const boardClass = getBoardClass(paper.exam_board);

    const card = document.createElement('div');
    card.className = 'paper-card';

    card.innerHTML = `
      <div class="paper-header">
        <div class="paper-icon">📄</div>
        <h3 class="paper-title">${escapeHtml(paper.title || 'Untitled')}</h3>
      </div>
      <div class="paper-tags">
        <span class="tag ${boardClass}">${paper.exam_board || ''}</span>
        <span class="tag">${paper.level || ''}</span>
        <span class="tag">${paper.subject || ''}</span>
      </div>
      <div class="paper-meta">
        ${paper.year ? `<span>📅 ${paper.year}</span>` : ''}
      </div>
      <div class="paper-footer">
        <a href="${paper.file_url}" target="_blank" rel="noopener" class="btn btn-gold btn-sm">
          📥 Download
        </a>
      </div>
    `;
    grid.appendChild(card);
  });
}

// ============================================================
// FILTERS
// ============================================================

function filterByBoard(board, btn) {
  filterBoard = board;
  const bar = document.getElementById('board-filters');
  if (bar) {
    bar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    if (btn) btn.classList.add('active');
  }
  renderPapers();
}

function filterByLevel(level, btn) {
  selectedLevel = level;
  const bar = document.getElementById('level-filters');
  if (bar) {
    bar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    if (btn) btn.classList.add('active');
  }
  renderPapers();
}

// ============================================================
// SEARCH
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('paper-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      paperQuery = e.target.value.trim();
      renderPapers();
    });
  }
});

// ============================================================
// PAGE LOAD
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  loadPapers();
});
