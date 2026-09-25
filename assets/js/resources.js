/* ============================================================
   EDUVILLE 2.0 — RESOURCES.JS
   Past papers library with filter + search
   ============================================================ */

const papersClient = window.db;

let allPapers = [];
let filterBoard = 'all';
let filterLevel = 'all';
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

function getBoardClass(board) {
  if (board === 'ZIMSEC') return 'tag-zimsec';
  if (board === 'Cambridge') return 'tag-cambridge';
  if (board === 'BEC') return 'tag-bec';
  return 'tag';
}

function getPaperIcon(type) {
  if (!type) return '📄';
  const t = type.toLowerCase();
  if (t.includes('marking') || t.includes('scheme')) return '✅';
  if (t.includes('full')) return '📚';
  return '📄';
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
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    allPapers = data || [];
    renderPapers();
    updateAddButton();

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

  // Filter
  let filtered = allPapers;
  if (filterBoard !== 'all') {
    filtered = filtered.filter(p => p.exam_board === filterBoard);
  }
  if (filterLevel !== 'all') {
    filtered = filtered.filter(p => p.level === filterLevel);
  }
  if (currentQuery) {
    const q = currentQuery.toLowerCase();
    filtered = filtered.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.subject || '').toLowerCase().includes(q) ||
      (p.exam_board || '').toLowerCase().includes(q) ||
      String(p.year || '').includes(q)
    );
  }

  // Update heading + count
  if (heading) {
    if (filterBoard === 'all' && filterLevel === 'all') {
      heading.textContent = 'All Papers';
    } else {
      heading.textContent = [filterBoard, filterLevel].filter(f => f !== 'all').join(' · ');
    }
  }
  if (count) count.textContent = filtered.length + (filtered.length === 1 ? ' paper' : ' papers');

  // Empty state
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">📭</div>
        <h3>No papers yet</h3>
        <p>Past papers will appear here once teachers start uploading.</p>
      </div>
    `;
    return;
  }

  // Render cards
  grid.innerHTML = '';
  filtered.forEach((paper) => {
    const card = document.createElement('div');
    card.className = 'paper-card';

    const boardClass = getBoardClass(paper.exam_board);
    const icon = getPaperIcon(paper.paper_type);
    const year = paper.year ? `<span>📅 ${paper.year}</span>` : '';
    const size = paper.file_size_mb ? `<span>💾 ${paper.file_size_mb} MB</span>` : '';
    const type = paper.paper_type ? `<span>📝 ${escapeHtml(paper.paper_type)}</span>` : '';

    card.innerHTML = `
      <div class="paper-header">
        <div class="paper-icon">${icon}</div>
        <h3 class="paper-title">${escapeHtml(paper.title || 'Untitled Paper')}</h3>
      </div>

      <div class="paper-tags">
        ${paper.exam_board ? `<span class="tag ${boardClass}">${escapeHtml(paper.exam_board)}</span>` : ''}
        ${paper.level ? `<span class="tag">${escapeHtml(paper.level)}</span>` : ''}
        ${paper.subject ? `<span class="tag">${escapeHtml(paper.subject)}</span>` : ''}
      </div>

      <div class="paper-meta">
        ${type}
        ${year}
        ${size}
      </div>

      <div class="paper-footer">
        <span class="paper-author">👤 EduVille</span>
        <a href="${paper.file_url}" target="_blank" rel="noopener" class="btn btn-gold btn-sm">
          <i data-lucide="download" style="width:13px;height:13px;"></i>
          Download
        </a>
      </div>
    `;

    grid.appendChild(card);
  });

  // Re-init Lucide icons
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ============================================================
// FILTERS
// ============================================================

function filterByBoard(board, btn) {
  filterBoard = board;
  const bar = document.getElementById('board-filters');
  bar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderPapers();
}

function filterByLevel(level, btn) {
  filterLevel = level;
  const bar = document.getElementById('level-filters');
  bar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderPapers();
}

// ============================================================
// SEARCH
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('paper-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentQuery = e.target.value.trim();
      renderPapers();
    });
  }
});

// ============================================================
// SHOW "+ ADD PAPER" IF LOGGED IN
// ============================================================

async function updateAddButton() {
  const btn = document.getElementById('add-paper-btn');
  if (!btn) return;

  const { data: { session } } = await papersClient.auth.getSession();
  if (session) {
    btn.style.display = 'inline-flex';
  }
}

// ============================================================
// PAGE LOAD
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  loadPapers();
});
