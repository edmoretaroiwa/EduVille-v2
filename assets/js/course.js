/* ============================================================
   EDUVILLE 2.0 — COURSE.JS
   Single course view with lessons
   ============================================================ */

const coursesClient = window.db;

// ============================================================
// HELPERS
// ============================================================

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getCourseId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

// ============================================================
// LOAD COURSE
// ============================================================

async function loadCourse() {
  const courseId = getCourseId();
  const header = document.getElementById('course-header');

  if (!courseId) {
    header.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">❌</div>
        <h3>Course not found</h3>
        <p>No course was specified.</p>
        <a href="courses.html" class="btn btn-gold">Browse All Courses</a>
      </div>
    `;
    return;
  }

  try {
    const { data: course, error } = await courseClient
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (error || !course) throw new Error('Course not found');

    // Update page title
    document.title = course.title + ' — EduVille';

    // Board tag class
    const boardClass = course.exam_board === 'ZIMSEC' ? 'tag-zimsec'
                     : course.exam_board === 'Cambridge' ? 'tag-cambridge'
                     : course.exam_board === 'BEC' ? 'tag-bec'
                     : 'tag';

    // Render header
    header.innerHTML = `
      <div class="course-header-block">
        <div class="course-header-content">
          <div class="course-header-emoji">${course.icon_emoji || '📘'}</div>
          <div class="course-header-text">
            <h1>${escapeHtml(course.title)}</h1>
            <p>${escapeHtml(course.description || 'No description yet.')}</p>
            <div class="course-header-tags">
              <span class="tag ${boardClass}">${course.exam_board}</span>
              <span class="tag">${course.level}</span>
              <span class="tag">${course.subject}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Load lessons
    loadLessons(courseId);

  } catch (error) {
    console.error('Course error:', error);
    header.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">❌</div>
        <h3>Course not found</h3>
        <p>${error.message}</p>
        <a href="courses.html" class="btn btn-gold">Browse All Courses</a>
      </div>
    `;
  }
}

// ============================================================
// LOAD LESSONS
// ============================================================

async function loadLessons(courseId) {
  const list = document.getElementById('lessons-list');
  const count = document.getElementById('lessons-count');

  try {
    const { data, error } = await courseClient
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .eq('is_published', true)
      .order('order_index', { ascending: true });

    if (error) throw error;

    const lessons = data || [];

    if (count) {
      count.textContent = lessons.length + (lessons.length === 1 ? ' lesson' : ' lessons');
    }

    if (lessons.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <h3>No lessons yet</h3>
          <p>Lessons will appear here once teachers start adding them.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = '';
    lessons.forEach((lesson, i) => {
      const row = document.createElement('a');
      row.href = `lesson.html?id=${lesson.id}`;
      row.className = 'lesson-row';

      const duration = lesson.duration_minutes ? `${lesson.duration_minutes} min` : 'Video';

      row.innerHTML = `
        <div class="lesson-left">
          <div class="lesson-num">${String(i + 1).padStart(2, '0')}</div>
          <div class="lesson-info">
            <h4>${escapeHtml(lesson.title)}</h4>
            <p>📖 ${duration}</p>
          </div>
        </div>
        <div class="lesson-play">▶</div>
      `;

      list.appendChild(row);
    });

  } catch (error) {
    console.error('Lessons error:', error);
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Could not load lessons</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// ============================================================
// PAGE LOAD
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  loadCourse();
});
