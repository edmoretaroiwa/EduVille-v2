/* ============================================================
   EDUVILLE 2.0 — LESSON.JS
   Single lesson view with markdown + video + progress
   ============================================================ */

const lessonClient = window.db;

let currentLesson = null;

function getLessonId() {
  return new URLSearchParams(window.location.search).get('id');
}

function extractYouTubeEmbed(url) {
  if (!url) return null;
  let m = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (m) return 'https://www.youtube.com/embed/' + m[1];
  m = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (m) return 'https://www.youtube.com/embed/' + m[1];
  m = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  if (m) return 'https://www.youtube.com/embed/' + m[1];
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
    const { data: lesson, error } = await lessonClient
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single();

    if (error || !lesson) {
      showNotFound('Lesson not found.');
      return;
    }

    currentLesson = lesson;
    document.title = lesson.title + ' — EduVille';

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
    metaEl.innerHTML = `📖 ${duration}`;

    const markdownHtml = lesson.content_markdown
      ? (typeof marked !== 'undefined' ? marked.parse(lesson.content_markdown) : '<pre>' + escapeHtml(lesson.content_markdown) + '</pre>')
      : '<p><em>No content yet for this lesson.</em></p>';

    const videoEmbed = extractYouTubeEmbed(lesson.video_url);
    const videoBlock = videoEmbed
      ? `<div class="video-wrapper"><iframe src="${videoEmbed}" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div>`
      : `<div class="video-wrapper no-video">📹 No video for this lesson</div>`;

    contentEl.innerHTML = `
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

function showNotFound(message) {
  const el = document.getElementById('lesson-content');
  document.getElementById('lesson-title').textContent = '❌ Lesson not found';
  document.getElementById('lesson-meta').textContent = '';
  el.innerHTML = `
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
  if (!currentLesson) return;
  const btn = event?.target;
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;"></span> Saving...';
  }

  try {
    const { data: { session } } = await lessonClient.auth.getSession();
    if (!session) {
      alert('Please log in to save progress.');
      if (btn) { btn.disabled = false; btn.innerHTML = '✓ Mark as Complete'; }
      return;
    }

    const { error } = await lessonClient
      .from('progress')
      .upsert({
        user_id: session.user.id,
        lesson_id: currentLesson.id,
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,lesson_id' });

    if (error) throw error;

    if (btn) {
      btn.innerHTML = '✅ Completed!';
      btn.classList.remove('btn-gold');
      btn.classList.add('btn-secondary');
    }
    alert('🎉 Lesson marked as complete!\n\nCommit to Your Future ✨');
  } catch (error) {
    console.error('Progress error:', error);
    alert('Could not save: ' + error.message);
    if (btn) { btn.disabled = false; btn.innerHTML = '✓ Mark as Complete'; }
  }
}

// ============================================================
// PAGE LOAD
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  loadLesson();
});
