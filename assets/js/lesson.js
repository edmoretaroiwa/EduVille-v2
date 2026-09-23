/* ============================================================
   EDUVILLE 2.0 — LESSON.JS
   Single lesson view with markdown + video
   ============================================================ */

const { createClient } = supabase;
const lessonClient = createClient(
  EDUVILLE_CONFIG.SUPABASE_URL,
  EDUVILLE_CONFIG.SUPABASE_ANON_KEY
);

// ============================================================
// HELPERS
// ============================================================

function getLessonId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function extractYouTubeEmbed(url) {
  if (!url) return null;
  let match = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (match) return 'https://www.youtube.com/embed/' + match[1];
  match = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (match) return 'https://www.youtube.com/embed/' + match[1];
  match = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  if (match) return 'https://www.youtube.com/embed/' + match[1];
  return null;
}

// ============================================================
// LOAD LESSON
// ============================================================

async function loadLesson() {
  const lessonId = getLessonId();
  const contentEl = document.getElementById('lesson-content');
  const titleEl = document.getElementById('lesson-title');
  const metaEl = document.getElementById('lesson-meta');
  const breadcrumbCourse = document.getElementById('breadcrumb-course');
  const breadcrumbLesson = document.getElementById('breadcrumb-lesson');

  if (!lessonId) {
    showNotFound('No lesson specified.');
    return;
  }

  try {
    // Load lesson
    const { data: lesson, error: lessonError } = await lessonClient
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      showNotFound('Lesson not found.');
      return;
    }

    // Update page title
    document.title = lesson.title + ' — EduVille';

    // Load course info for breadcrumb
    if (lesson.course_id) {
      const { data: course } = await lessonClient
        .from('courses')
        .select('id, title')
        .eq('id', lesson.course_id)
        .single();

      if (course && breadcrumbCourse) {
        breadcrumbCourse.textContent = course.title;
        breadcrumbCourse.href = `course.html?id=${course.id}`;
      }
    }

    // Update breadcrumb
    if (breadcrumbLesson) breadcrumbLesson.textContent = lesson.title;

    // Update header
    titleEl.textContent = lesson.title;

    const duration = lesson.duration_minutes ? `${lesson.duration_minutes} min` : 'Lesson';
    metaEl.innerHTML = `📖 ${duration}${lesson.updated_at ? ' · Updated ' + formatDate(lesson.updated_at) : ''}`;

    // Convert markdown to HTML
    const markdownHtml = lesson.content_markdown
      ? marked.parse(lesson.content_markdown)
      : '<p><em>No content yet for this lesson.</em></p>';

    // Video embed
    const videoEmbed = extractYouTubeEmbed(lesson.video_url);
    const videoBlock = videoEmbed
      ? `<div class="video-wrapper"><iframe src="${videoEmbed}" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div>`
      : `<div class="video-wrapper no-video">📹 No video for this lesson</div>`;

    // Render lesson
    contentEl.innerHTML = `
      <div class="lesson-content-grid">
        <article class="markdown-body">
          ${markdownHtml}
        </article>
        <aside class="lesson-sidebar">
          ${videoBlock}
          <div class="lesson-actions">
            <h4>📌 Quick actions</h4>
            <button class="btn btn-gold btn-sm" onclick="markComplete()">
              ✓ Mark as Complete
            </button>
            <button class="btn btn-secondary btn-sm" onclick="saveLesson()">
              ⭐ Save for Later
            </button>
            <a href="courses.html" class="btn btn-ghost btn-sm">
              ← Back to Courses
            </a>
          </div>
        </aside>
      </div>
    `;

  } catch (error) {
    console.error('Lesson error:', error);
    showNotFound(error.message);
  }
}

// ============================================================
// ERROR STATE
// ============================================================

function showNotFound(message) {
  const contentEl = document.getElementById('lesson-content');
  document.getElementById('lesson-title').textContent = '❌ Lesson not found';
  document.getElementById('lesson-meta').textContent = '';
  contentEl.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">❌</div>
      <h3>Lesson not found</h3>
      <p>${message}</p>
      <a href="courses.html" class="btn btn-gold">Browse All Courses</a>
    </div>
  `;
}

// ============================================================
// UTILITY
// ============================================================

function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ============================================================
// PLACEHOLDER ACTIONS (to implement later)
// ============================================================

function markComplete() {
  alert('✅ Progress tracking coming soon!');
}

function saveLesson() {
  alert('⭐ Bookmarking coming soon!');
}

// ============================================================
// PAGE LOAD
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  loadLesson();
});
