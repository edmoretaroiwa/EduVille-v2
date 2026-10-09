/* ============================================================
   EDUVILLE 2.0 — ADD-LESSON.JS
   Teachers publish a lesson + 5 practice questions in one form.
   ============================================================ */

const addLessonClient = window.db;

let allCourses = [];
let questionCount = 0;

function getYouTubeId(url) {
  if (!url) return null;
  const m = String(url).trim().match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

async function initAddLesson() {
  const gate = document.getElementById('gate');
  const form = document.getElementById('lesson-form');
  if (!gate || !form) return;

  try {
    const { session, role } = await getMyRole();
    if (!session) { gate.innerHTML = accessGateHtml('login'); return; }
    if (!isTeacherRole(role)) { gate.innerHTML = accessGateHtml('teacher'); return; }

    // Load courses
    const { data: courses, error } = await addLessonClient
      .from('courses')
      .select('id, title, subject, level, exam_board')
      .eq('is_published', true)
      .order('title', { ascending: true });

    if (error) throw error;
    allCourses = courses || [];

    if (allCourses.length === 0) {
      gate.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <h3>No courses yet</h3>
          <p>Ask an admin to add a course before publishing lessons.</p>
        </div>`;
      return;
    }

    // Populate course dropdown
    const courseSelect = document.getElementById('l-course');
    courseSelect.innerHTML = allCourses.map(c =>
      `<option value="${escapeHtml(c.id)}">${escapeHtml(c.title)} (${escapeHtml(c.exam_board)} · ${escapeHtml(c.level)})</option>`
    ).join('');

    // Show form
    gate.innerHTML = '';
    form.style.display = 'block';
    addQuestion(); // start with one question

    document.getElementById('add-question-btn').addEventListener('click', addQuestion);
    form.addEventListener('submit', handlePublish);
  } catch (error) {
    console.error('Add lesson init error:', error);
    gate.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠</div>
        <h3>Could not load the form</h3>
        <p>${escapeHtml(error.message)}</p>
      </div>`;
  }
}

// ============================================================
// QUESTION CARD BUILDER
// ============================================================

function addQuestion() {
  if (questionCount >= 10) {
    showFormMessage('error', 'Maximum 10 questions per lesson.');
    return;
  }
  questionCount++;
  const num = questionCount;

  const wrapper = document.getElementById('questions-container');
  const card = document.createElement('div');
  card.className = 'form-card';
  card.style.background = 'var(--bg-primary)';
  card.style.padding = '1rem';
  card.dataset.qnum = num;

  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.7rem;">
      <strong style="color:var(--gold);">Question ${num}</strong>
      <button type="button" class="btn btn-ghost btn-sm remove-q" style="color:#ff7b72;">Remove</button>
    </div>
    <div class="form-group">
      <label>Prompt</label>
      <textarea class="q-prompt" style="min-height:60px;" placeholder="What is 2 + 2?"></textarea>
    </div>
    <div class="form-grid">
      <div class="form-group"><label>A</label><input type="text" class="q-a"></div>
      <div class="form-group"><label>B</label><input type="text" class="q-b"></div>
      <div class="form-group"><label>C</label><input type="text" class="q-c"></div>
      <div class="form-group"><label>D</label><input type="text" class="q-d"></div>
    </div>
    <div class="form-grid">
      <div class="form-group">
        <label>Correct answer</label>
        <select class="q-correct form-select">
          <option>A</option><option>B</option><option>C</option><option>D</option>
        </select>
      </div>
      <div class="form-group">
        <label>Difficulty</label>
        <select class="q-diff form-select">
          <option value="easy">Easy</option>
          <option value="medium" selected>Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Explanation (optional)</label>
      <input type="text" class="q-expl" placeholder="Short explanation shown after answering">
    </div>
  `;

  card.querySelector('.remove-q').addEventListener('click', () => {
    card.remove();
    questionCount--;
  });

  wrapper.appendChild(card);
}

// ============================================================
// PUBLISH
// ============================================================

async function handlePublish(event) {
  event.preventDefault();
  hideFormMessage();

  const courseId = document.getElementById('l-course').value;
  const title = document.getElementById('l-title').value.trim();
  const content = document.getElementById('l-content').value.trim();
  const duration = Number(document.getElementById('l-duration').value) || null;
  const videoUrl = document.getElementById('l-video').value.trim();

  if (title.length < 3) return fieldErr('l-title', 'Title must be at least 3 characters.');
  if (content.length < 50) return fieldErr('l-content', 'Lesson content is too short. Write at least a few paragraphs.');

  // Collect questions
  const questionCards = document.querySelectorAll('#questions-container .form-card');
  const questions = [];
  for (const [i, card] of [...questionCards].entries()) {
    const prompt = card.querySelector('.q-prompt').value.trim();
    const a = card.querySelector('.q-a').value.trim();
    const b = card.querySelector('.q-b').value.trim();
    const c = card.querySelector('.q-c').value.trim();
    const d = card.querySelector('.q-d').value.trim();
    const correct = card.querySelector('.q-correct').value;
    const difficulty = card.querySelector('.q-diff').value;
    const explanation = card.querySelector('.q-expl').value.trim();

    if (!prompt || !a || !b || !c || !d) {
      return showFormMessage('error', `Question ${i + 1} is incomplete — fill in the prompt and all 4 options.`);
    }

    questions.push({
      prompt, option_a: a, option_b: b, option_c: c, option_d: d,
      correct_option: correct, difficulty, explanation: explanation || null,
      order_index: i
    });
  }

  if (questions.length === 0) {
    return showFormMessage('error', 'Add at least 1 practice question.');
  }

  const course = allCourses.find(c => c.id === courseId);
  const btn = document.getElementById('l-submit');
  btn.disabled = true;
  btn.textContent = 'Publishing...';

  try {
    // 1. Insert lesson
    const { data: lesson, error: lErr } = await addLessonClient
      .from('lessons')
      .insert({
        course_id: courseId,
        title,
        content_markdown: content,
        video_url: videoUrl || null,
        duration_minutes: duration,
        is_published: true,
        order_index: 999
      })
      .select('id')
      .single();

    if (lErr) throw lErr;

    // 2. Insert all questions
    const questionRows = questions.map(q => ({
      lesson_id: lesson.id,
      course_id: courseId,
      subject: course ? course.subject : 'General',
      ...q
    }));

    const { error: qErr } = await addLessonClient.from('questions').insert(questionRows);
    if (qErr) throw qErr;

    showFormMessage('success',
      `Lesson "${title}" published with ${questions.length} questions!`,
      { href: `lesson.html?id=${lesson.id}`, text: 'View it' }
    );

    // Reset form fields (keep course selection)
    document.getElementById('l-title').value = '';
    document.getElementById('l-content').value = '';
    document.getElementById('l-duration').value = '';
    document.getElementById('l-video').value = '';
    document.getElementById('questions-container').innerHTML = '';
    questionCount = 0;
    addQuestion();
  } catch (error) {
    console.error('Publish error:', error);
    const denied = error && (error.code === '42501' || /row-level security/i.test(error.message || ''));
    showFormMessage('error', denied
      ? 'You do not have permission to publish lessons with this account.'
      : `Could not publish: ${error.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = '✓ Publish lesson';
  }
}

function fieldErr(id, msg) {
  showFormMessage('error', msg);
  const el = document.getElementById(id);
  if (el) el.focus();
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  initAddLesson();
});