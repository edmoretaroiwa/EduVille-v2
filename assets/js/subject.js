/* ============================================================
   EDUVILLE 2.0 — SUBJECT.JS
   Renders a subject hub: courses, lessons, videos for one subject
   ============================================================ */

const subjectClient = window.db;

async function initSubjectPage() {
  const root = document.getElementById('subject-content');
  const config = document.getElementById('subject-config');
  if (!root || !config) return;

  const subject = config.dataset.subject || 'Mathematics';
  const boardFilter = config.dataset.board || '';

  // Update page title placeholder immediately
  const h1 = document.getElementById('subject-title');
  if (h1) h1.textContent = subject;

  try {
    // 1. Load courses for this subject
    let coursesQuery = subjectClient
      .from('courses')
      .select('*')
      .eq('subject', subject)
      .eq('is_published', true)
      .order('title', { ascending: true });

    if (boardFilter) coursesQuery = coursesQuery.eq('exam_board', boardFilter);

    const { data: courses, error: cErr } = await coursesQuery;
    if (cErr) throw cErr;

    const courseList = courses || [];
    const courseIds = courseList.map(c => c.id);

    // 2. Load lessons + videos in parallel
    const [lessonsRes, videosRes] = await Promise.all([
      courseIds.length
        ? subjectClient
            .from('lessons')
            .select('id, title, duration_minutes, course_id')
            .in('course_id', courseIds)
            .eq('is_published', true)
            .order('order_index', { ascending: true })
            .limit(12)
        : Promise.resolve({ data: [] }),
      subjectClient
        .from('videos')
        .select('*')
        .eq('course', subject)
        .limit(6)
    ]);

    if (lessonsRes.error) throw lessonsRes.error;
    if (videosRes.error) throw videosRes.error;

    const lessons = lessonsRes.data || [];
    const videos = videosRes.data || [];

    // 3. Build the page
    renderSubjectPage(root, subject, courseList, lessons, videos);

    // 4. Populate stats
    const stats = {
      courses: courseList.length,
      lessons: lessons.length,
      videos: videos.length
    };
    document.querySelectorAll('[data-stat]').forEach(el => {
      const key = el.dataset.stat;
      if (stats[key] !== undefined) el.textContent = stats[key];
    });

  } catch (error) {
    console.error('Subject page error:', error);
    root.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠</div>
        <h3>Could not load this subject</h3>
        <p>${escapeHtml(error.message)}</p>
        <a href="courses.html" class="btn btn-gold">Browse all courses</a>
      </div>`;
  }
}

// ============================================================
// RENDER
// ============================================================

function renderSubjectPage(root, subject, courses, lessons, videos) {
  const courseMap = new Map(courses.map(c => [c.id, c]));

  const coursesHtml = courses.length === 0
    ? `<div class="empty-state" style="grid-column:1/-1;">
         <div class="empty-state-icon">📭</div>
         <h3>No courses yet</h3>
         <p>We're adding ${escapeHtml(subject)} courses soon. Follow us to get notified.</p>
         <a href="signup.html" class="btn btn-gold">Sign up for updates</a>
       </div>`
    : courses.map(c => {
        const boardClass = c.exam_board === 'ZIMSEC' ? 'tag-zimsec'
                         : c.exam_board === 'Cambridge' ? 'tag-cambridge'
                         : c.exam_board === 'BEC' ? 'tag-bec' : 'tag';
        return `
          <a href="course.html?id=${encodeURIComponent(c.id)}" class="course-card">
            <div class="course-card-header">
              <div class="course-emoji">${escapeHtml(c.icon_emoji || '📘')}</div>
              <h3 class="course-title">${escapeHtml(c.title)}</h3>
            </div>
            <p class="course-desc">${escapeHtml(c.description || 'No description yet.')}</p>
            <div class="course-tags">
              <span class="tag ${boardClass}">${escapeHtml(c.exam_board)}</span>
              <span class="tag">${escapeHtml(c.level)}</span>
            </div>
            <div class="course-footer">
              <span>→ Open course</span>
            </div>
          </a>`;
      }).join('');

  const lessonsHtml = lessons.length === 0
    ? `<p class="form-note" style="text-align:center;">Lessons will appear here once courses are added.</p>`
    : lessons.map((l, i) => {
        const course = courseMap.get(l.course_id);
        return `
          <a class="note-row" href="lesson.html?id=${encodeURIComponent(l.id)}">
            <span class="note-num">${String(i + 1).padStart(2, '0')}</span>
            <span class="note-title">${escapeHtml(l.title)}</span>
            <span class="note-meta">${l.duration_minutes ? escapeHtml(l.duration_minutes) + ' min' : (course ? escapeHtml(course.title) : 'Lesson')}</span>
          </a>`;
      }).join('');

  const videosHtml = videos.length === 0
    ? `<p class="form-note" style="text-align:center;">Videos coming soon.</p>`
    : videos.map(v => {
        const ytId = extractYouTubeId(v.embed_url || v.original_url || '');
        const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : '';
        return `
          <a href="video.html?id=${encodeURIComponent(v.id)}" class="video-card">
            <div class="video-thumb">
              ${thumb ? `<img src="${thumb}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;">` : ''}
              <div class="video-play-icon">▶</div>
              ${v.duration ? `<div class="video-duration">${escapeHtml(v.duration)}</div>` : ''}
            </div>
            <div class="video-body">
              <h3 class="video-title">${escapeHtml(v.title || 'Untitled')}</h3>
              <div class="video-author">👤 ${escapeHtml(v.author || 'EduVille')}</div>
            </div>
          </a>`;
      }).join('');

  root.innerHTML = `
    <!-- COURSES -->
    <section>
      <div class="section-heading-row">
        <h2 class="section-heading">📚 Courses</h2>
        <span class="text-muted">${courses.length} ${courses.length === 1 ? 'course' : 'courses'}</span>
      </div>
      <div class="grid-courses">${coursesHtml}</div>
    </section>

    <!-- LESSONS -->
    <section style="margin-top:2rem;">
      <div class="section-heading-row">
        <h2 class="section-heading">📖 Lessons</h2>
        <a href="courses.html" class="btn btn-ghost btn-sm">Browse all →</a>
      </div>
      <div class="notes-group">
        ${lessonsHtml}
      </div>
    </section>

    <!-- VIDEOS -->
    <section style="margin-top:2rem;">
      <div class="section-heading-row">
        <h2 class="section-heading">🎬 Video lessons</h2>
        <a href="videos.html" class="btn btn-ghost btn-sm">View all →</a>
      </div>
      <div class="grid-courses">${videosHtml}</div>
    </section>
  `;

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ============================================================
// YouTube ID helper (local copy — also in videos.js)
// ============================================================

function extractYouTubeId(url) {
  if (!url) return null;
  let m = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  m = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  m = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  return null;
}

// ============================================================
// PAGE LOAD
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  initSubjectPage();
});