/* ============================================================
   EDUVILLE 2.0 — LESSON.JS
   Single lesson view with markdown + video
   ============================================================ */
const lessonClient = window.db;

// Current lesson object (set on load)
let currentLesson = null;

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

function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' });
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
    const { data: lesson, error: lessonError } = await lessonClient
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      showNotFound('Lesson not found.');
      return;
    }

    // Store globally for markComplete
    currentLesson = lesson;

    document.title = lesson.title + ' — EduVille';

    // Load course for breadcrumb
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

    if (breadcrumbLesson) breadcrumbLesson.textContent = lesson.title;

    titleEl.textContent = lesson.title;

    const duration = lesson.duration_minutes ? `${lesson.duration_minutes} min` : 'Lesson';
    metaEl.innerHTML = `📖 ${duration}${lesson.updated_at ? ' · Updated ' + formatDate(lesson.updated_at) : ''}`;

    const markdownHtml = lesson.content_markdown
      ? marked.parse(lesson.content_markdown)
      : '<p><em>No content yet for this lesson.</em></p>';

    const videoEmbed = extractYouTubeEmbed(lesson.video_url);
    const videoBlock = videoEmbed
      ? `<div class="video-wrapper"><iframe src="${videoEmbed}" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div>`
      : `<div class="video-wrapper no-video">📹 No video for this lesson</div>`;

    // Show current progress status if logged in
    let progressStatus = '';
    try {
      if (typeof getLessonProgress === 'function') {
        const p = await getLessonProgress(lesson.id);
        if (p?.status === 'completed') {
          progressStatus = '<div class="alert alert-success" style="margin-bottom:0.8rem;">✅ You completed this lesson</div>';
        }
      }
    } catch (e) {}

    contentEl.innerHTML = `
      ${progressStatus}
      <div class="lesson-content-grid">
        <article class="markdown-body">
          ${markdownHtml}
        </article>
        <aside class="lesson-sidebar">
          ${videoBlock}
          <div class="lesson-actions">
            <h4>📌 Quick actions</h4>
            <button class="btn btn-gold btn-sm" onclick="markComplete(event)">
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
// MARK COMPLETE
// ============================================================

async function markComplete(event) {
  if (!currentLesson) {
    alert('Lesson data not loaded yet.');
    return;
  }

  const btn = event?.target;
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px;"></span> Saving...';
  }

  if (typeof markLessonComplete !== 'function') {
    alert('Progress system is still loading. Please refresh and try again.');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '✓ Mark as Complete';
    }
    return;
  }

  const success = await markLessonComplete(currentLesson.id, 'completed');

  if (success) {
    if (btn) {
      btn.innerHTML = '✅ Completed!';
      btn.classList.remove('btn-gold');
      btn.classList.add('btn-secondary');
    }
    alert('🎉 Lesson marked as complete!\n\nKeep going — Commit to Your Future ✨');
  } else {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '✓ Mark as Complete';
    }
  }
}

// ============================================================
// PLACEHOLDER
// ============================================================

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
