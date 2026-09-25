/* ============================================================
   EDUVILLE 2.0 — PROGRESS.JS
   Student progress tracking & dashboard
   ============================================================ */

const progressClient = window.db;

// ============================================================
// HELPERS
// ============================================================

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ============================================================
// LOAD DASHBOARD
// ============================================================

async function loadDashboard() {
  const container = document.getElementById('dashboard-content');
  if (!container) return;

  try {
    // Check if user is logged in
    const { data: { session } } = await progressClient.auth.getSession();

    if (!session) {
      container.innerHTML = `
        <div class="not-logged-in">
          <div style="font-size:3rem; margin-bottom:1rem;">🔐</div>
          <h2>Please log in</h2>
          <p>Sign in to track your learning progress across all your courses.</p>
          <a href="login.html" class="btn btn-gold">Login</a>
          <a href="signup.html" class="btn btn-secondary">Create Account</a>
        </div>
      `;
      return;
    }

    // Load user profile
    const { data: profile } = await progressClient
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    const userName = profile?.full_name?.split(' ')[0] || 'Student';

    // Load progress with lesson details
    const { data: progressData, error } = await progressClient
      .from('progress')
      .select(`
        *,
        lessons (
          id, title, course_id,
          courses (id, title, icon_emoji, subject, level, exam_board)
        )
      `)
      .eq('user_id', session.user.id);

    if (error) throw error;

    const progress = progressData || [];
    const completed = progress.filter(p => p.status === 'completed').length;
    const inProgress = progress.filter(p => p.status === 'in_progress').length;

    // Group by course
    const coursesMap = new Map();
    progress.forEach(p => {
      const course = p.lessons?.courses;
      if (!course) return;
      if (!coursesMap.has(course.id)) {
        coursesMap.set(course.id, {
          id: course.id,
          title: course.title,
          icon: course.icon_emoji || '📘',
          subject: course.subject,
          level: course.level,
          exam_board: course.exam_board,
          total: 0,
          completed: 0,
          inProgress: 0
        });
      }
      const c = coursesMap.get(course.id);
      c.total++;
      if (p.status === 'completed') c.completed++;
      if (p.status === 'in_progress') c.inProgress++;
    });

    const courses = Array.from(coursesMap.values());
    const overallPercent = progress.length > 0
      ? Math.round((completed / progress.length) * 100)
      : 0;

    // Recent activity (last 5 interactions)
    const recent = progress
      .slice()
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 5);

    // Render
    container.innerHTML = `
      <div class="dashboard-header">
        <h1>${getGreeting()}, ${escapeHtml(userName)} 👋</h1>
        <p class="welcome-text">Commit to Your Future. Keep going — you're doing great.</p>
      </div>

      <div class="stats-grid">
        <div class="dash-stat">
          <div class="dash-stat-icon">📚</div>
          <div class="dash-stat-value">${courses.length}</div>
          <div class="dash-stat-label">Courses Started</div>
        </div>
        <div class="dash-stat">
          <div class="dash-stat-icon">✅</div>
          <div class="dash-stat-value">${completed}</div>
          <div class="dash-stat-label">Lessons Done</div>
        </div>
        <div class="dash-stat">
          <div class="dash-stat-icon">📈</div>
          <div class="dash-stat-value">${overallPercent}%</div>
          <div class="dash-stat-label">Overall</div>
        </div>
        <div class="dash-stat">
          <div class="dash-stat-icon">🔥</div>
          <div class="dash-stat-value">${inProgress}</div>
          <div class="dash-stat-label">In Progress</div>
        </div>
      </div>

      ${courses.length > 0 ? `
        <section style="margin-top: 2rem;">
          <div class="section-heading-row">
            <h2 class="section-heading">📚 Course Progress</h2>
            <a href="courses.html" class="btn btn-ghost btn-sm">Browse more →</a>
          </div>
          ${courses.map(c => renderCourseProgress(c)).join('')}
        </section>
      ` : `
        <div class="not-logged-in" style="margin-top: 2rem;">
          <div style="font-size:3rem; margin-bottom:1rem;">🚀</div>
          <h2>Start your first lesson!</h2>
          <p>You haven't opened any lessons yet. Pick a course and begin.</p>
          <a href="courses.html" class="btn btn-gold">Browse Courses</a>
        </div>
      `}

      ${recent.length > 0 ? `
        <section style="margin-top: 2rem;">
          <div class="section-heading-row">
            <h2 class="section-heading">📖 Recent Activity</h2>
          </div>
          <div class="card" style="padding: 0 1.2rem;">
            ${recent.map(p => renderRecentActivity(p)).join('')}
          </div>
        </section>
      ` : ''}
    `;

  } catch (error) {
    console.error('Dashboard error:', error);
    container.innerHTML = `
      <div class="not-logged-in">
        <div style="font-size:3rem; margin-bottom:1rem;">⚠️</div>
        <h2>Could not load dashboard</h2>
        <p>${escapeHtml(error.message)}</p>
        <a href="index.html" class="btn btn-gold">Back to Home</a>
      </div>
    `;
  }
}

// ============================================================
// RENDER HELPERS
// ============================================================

function renderCourseProgress(course) {
  const percent = course.total > 0
    ? Math.round((course.completed / course.total) * 100)
    : 0;

  const boardClass = course.exam_board === 'ZIMSEC' ? 'tag-zimsec'
                   : course.exam_board === 'Cambridge' ? 'tag-cambridge'
                   : course.exam_board === 'BEC' ? 'tag-bec'
                   : 'tag';

  return `
    <a href="course.html?id=${course.id}" class="progress-card" style="display:block; text-decoration:none;">
      <div class="progress-card-header">
        <div class="progress-icon">${course.icon}</div>
        <div class="progress-title">
          <h3>${escapeHtml(course.title)}</h3>
          <p>
            <span class="tag ${boardClass}" style="font-size:0.65rem;">${course.exam_board}</span>
            <span class="tag" style="font-size:0.65rem;">${course.level}</span>
          </p>
        </div>
        <div class="progress-percent">${percent}%</div>
      </div>
      <div class="progress-bar-wrapper">
        <div class="progress-bar-fill" style="width:${percent}%;"></div>
      </div>
      <div class="progress-meta">
        <span>✅ ${course.completed} completed · 📖 ${course.inProgress} in progress</span>
        <span>View →</span>
      </div>
    </a>
  `;
}

function renderRecentActivity(p) {
  const lesson = p.lessons || {};
  const course = lesson.courses || {};
  const status = p.status === 'completed' ? '✅ Completed' : '📖 In progress';
  const when = p.updated_at ? new Date(p.updated_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) : '';

  return `
    <a href="lesson.html?id=${lesson.id}" class="activity-row">
      <div class="activity-icon">${course.icon_emoji || '📖'}</div>
      <div class="activity-info">
        <h4>${escapeHtml(lesson.title || 'Lesson')}</h4>
        <p>${escapeHtml(course.title || '')} · ${status}</p>
      </div>
      <span class="activity-status">${when}</span>
    </a>
  `;
}

// ============================================================
// MARK LESSON COMPLETE (called from lesson.js)
// ============================================================

async function markLessonComplete(lessonId, status = 'completed') {
  try {
    const { data: { session } } = await progressClient.auth.getSession();
    if (!session) {
      alert('Please log in to save progress.');
      return false;
    }

    const { error } = await progressClient
      .from('progress')
      .upsert({
        user_id: session.user.id,
        lesson_id: lessonId,
        status: status,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,lesson_id'
      });

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Progress save error:', error);
    alert('Could not save progress: ' + error.message);
    return false;
  }
}

// ============================================================
// LOAD PROGRESS FOR A LESSON
// ============================================================

async function getLessonProgress(lessonId) {
  try {
    const { data: { session } } = await progressClient.auth.getSession();
    if (!session) return null;

    const { data } = await progressClient
      .from('progress')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    return data;
  } catch (e) {
    return null;
  }
}

// ============================================================
// PAGE LOAD
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  if (document.getElementById('dashboard-content')) {
    loadDashboard();
  }
});
