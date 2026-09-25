/* ============================================================
   EDUVILLE 2.0 — COURSES.JS
   Loads and displays courses from Supabase
   ============================================================ */

// Initialize Supabase client
const coursesClient = window.db;

let allCourses = [];
let filterBoard = 'all';
let filterLevel = 'all';

// ============================================================
// LOAD COURSES
// ============================================================

async function loadCourses() {
  const grid = document.getElementById('courses-grid');
  if (!grid) return;

  try {
    const { data, error } = await coursesClient
      .from('courses')
      .select('*')
      .eq('is_published', true)
      .order('title', { ascending: true });

    if (error) throw error;

    allCourses = data || [];
    renderCourses();

  } catch (error) {
    console.error('Courses error:', error);
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">⚠️</div>
        <h3>Could not load courses</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// ============================================================
// RENDER COURSES
// ============================================================

function renderCourses() {
  const grid = document.getElementById('courses-grid');
  const count = document.getElementById('courses-count');
  const heading = document.getElementById('courses-heading');

  if (!grid) return;

  // Filter
  let filtered = allCourses;
  if (filterBoard !== 'all') {
    filtered = filtered.filter(c => c.exam_board === filterBoard);
  }
  if (filterLevel !== 'all') {
    filtered = filtered.filter(c => c.level === filterLevel);
  }

  // Update heading
  if (heading) {
    if (filterBoard === 'all' && filterLevel === 'all') {
      heading.textContent = 'All Courses';
    } else {
      heading.textContent = [filterBoard, filterLevel]
        .filter(f => f !== 'all')
        .join(' · ');
    }
  }

  // Update count
  if (count) {
    count.textContent = filtered.length + (filtered.length === 1 ? ' course' : ' courses');
  }

  // Empty state
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">📭</div>
        <h3>No courses found</h3>
        <p>Try a different filter.</p>
      </div>
    `;
    return;
  }

  // Render each course
  grid.innerHTML = '';
  filtered.forEach((course) => {
    const card = document.createElement('a');
    card.className = 'course-card';
    card.href = `course.html?id=${course.id}`;

    // Board tag class
    const boardClass = course.exam_board === 'ZIMSEC' ? 'tag-zimsec'
                     : course.exam_board === 'Cambridge' ? 'tag-cambridge'
                     : course.exam_board === 'BEC' ? 'tag-bec'
                     : 'tag';

    card.innerHTML = `
      <div class="course-card-header">
        <div class="course-emoji">${course.icon_emoji || '📘'}</div>
        <h3 class="course-title">${escapeHtml(course.title)}</h3>
      </div>
      <p class="course-desc">${escapeHtml(course.description || 'No description yet.')}</p>
      <div class="course-tags">
        <span class="tag ${boardClass}">${course.exam_board}</span>
        <span class="tag">${course.level}</span>
        <span class="tag">${course.subject}</span>
      </div>
      <div class="course-footer">
        <span>👤 Teachers</span>
        <span>→ Open</span>
      </div>
    `;

    grid.appendChild(card);
  });
}

// ============================================================
// FILTERS
// ============================================================

function filterCourses(board, btn) {
  filterBoard = board;
  const bar = btn.parentElement;
  bar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderCourses();
}

function filterLevel(level, btn) {
  filterLevel = level;
  const bar = btn.parentElement;
  bar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderCourses();
}

// ============================================================
// HELPERS
// ============================================================

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================
// PAGE LOAD
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  loadCourses();
});
