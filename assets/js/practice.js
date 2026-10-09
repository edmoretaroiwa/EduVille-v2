/* ============================================================
   EDUVILLE 2.0 — PRACTICE.JS
   Interactive practice tests
   ============================================================ */

const practiceClient = window.db;

let currentQuestions = [];
let currentAnswers = {}; // { questionId: 'A' | 'B' | 'C' | 'D' }
let currentLessonId = null;
let currentSubject = null;

// ============================================================
// ENTRY POINT
// ============================================================

async function initPractice() {
  const root = document.getElementById('practice-content');
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const lessonId = params.get('lesson');
  const subject = params.get('subject');

  if (lessonId) {
    await startLessonPractice(lessonId);
  } else if (subject) {
    await startSubjectPractice(subject);
  } else {
    renderSubjectPicker(root);
  }
}

// ============================================================
// SUBJECT PICKER (no query params)
// ============================================================

function renderSubjectPicker(root) {
  const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Studies'];

  root.innerHTML = `
    <div class="empty-state" style="padding:1rem 0;">
      <div class="empty-state-icon">🎯</div>
      <h3>Choose a subject to practise</h3>
      <p>Pick a subject, then a topic. You'll get 5 questions per topic with instant feedback.</p>
    </div>
    <div class="curriculum-grid">
      ${subjects.map(s => `
        <a href="practice.html?subject=${encodeURIComponent(s)}" class="curriculum-card">
          <div class="cc-flag">${subjectEmoji(s)}</div>
          <h4>${escapeHtml(s)}</h4>
          <p>Practice questions</p>
        </a>
      `).join('')}
    </div>
  `;
}

function subjectEmoji(s) {
  return {
    'Mathematics': '📘',
    'Physics': '🔬',
    'Chemistry': '⚗️',
    'Biology': '🧬',
    'Computer Studies': '💻'
  }[s] || '📚';
}

// ============================================================
// SUBJECT MODE — list lessons with questions
// ============================================================

async function startSubjectPractice(subject) {
  const root = document.getElementById('practice-content');
  currentSubject = subject;

  root.innerHTML = `<div class="empty-state"><div class="spinner"></div><p>Loading ${escapeHtml(subject)} practice...</p></div>`;

  try {
    // Get all lessons for this subject that have questions
    const { data: questions, error } = await practiceClient
      .from('questions')
      .select('lesson_id, lessons(id, title, order_index, courses(title, icon_emoji))')
      .eq('subject', subject);

    if (error) throw error;

    // Group by lesson
    const lessonsMap = new Map();
    (questions || []).forEach(q => {
      const l = q.lessons;
      if (!l) return;
      if (!lessonsMap.has(l.id)) {
        lessonsMap.set(l.id, { id: l.id, title: l.title, course: l.courses, count: 0 });
      }
      lessonsMap.get(l.id).count++;
    });

    const lessons = Array.from(lessonsMap.values()).sort((a, b) =>
      a.title.localeCompare(b.title)
    );

    if (lessons.length === 0) {
      root.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <h3>No practice questions yet</h3>
          <p>We're adding ${escapeHtml(subject)} questions soon. Check back later.</p>
          <a href="courses.html" class="btn btn-gold">Browse lessons instead</a>
        </div>`;
      return;
    }

    root.innerHTML = `
      <div class="section-heading-row">
        <h2 class="section-heading">${subjectEmoji(subject)} ${escapeHtml(subject)} practice</h2>
        <span class="text-muted">${lessons.length} ${lessons.length === 1 ? 'topic' : 'topics'}</span>
      </div>
      <div class="bm-grid" style="grid-template-columns:1fr;">
        ${lessons.map(l => `
          <a href="practice.html?lesson=${encodeURIComponent(l.id)}" class="bm-card">
            <div class="bm-card-main">
              <div class="bm-icon">${escapeHtml((l.course && l.course.icon_emoji) || '📘')}</div>
              <div class="bm-info">
                <h4>${escapeHtml(l.title)}</h4>
                <p>${l.count} question${l.count === 1 ? '' : 's'}</p>
              </div>
            </div>
          </a>
        `).join('')}
      </div>
    `;
  } catch (error) {
    console.error('Practice subject error:', error);
    root.innerHTML = errorState(error.message);
  }
}

// ============================================================
// LESSON MODE — take the test
// ============================================================

async function startLessonPractice(lessonId) {
  const root = document.getElementById('practice-content');
  currentLessonId = lessonId;
  currentAnswers = {};

  root.innerHTML = `<div class="empty-state"><div class="spinner"></div><p>Loading questions...</p></div>`;

  try {
    const [lessonRes, questionsRes] = await Promise.all([
      practiceClient.from('lessons').select('id, title, courses(title, icon_emoji)').eq('id', lessonId).maybeSingle(),
      practiceClient.from('questions').select('*').eq('lesson_id', lessonId).order('order_index', { ascending: true })
    ]);

    if (lessonRes.error) throw lessonRes.error;
    if (questionsRes.error) throw questionsRes.error;

    const lesson = lessonRes.data;
    const questions = questionsRes.data || [];

    if (!lesson) {
      root.innerHTML = errorState('Lesson not found.');
      return;
    }

    if (questions.length === 0) {
      root.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <h3>No questions yet</h3>
          <p>This lesson doesn't have practice questions yet.</p>
          <a href="lesson.html?id=${encodeURIComponent(lessonId)}" class="btn btn-gold">Read the lesson</a>
        </div>`;
      return;
    }

    currentQuestions = questions;
    currentSubject = questions[0].subject;

    document.title = `Practice: ${lesson.title} — EduVille`;

    renderQuiz(root, lesson, questions);
  } catch (error) {
    console.error('Practice lesson error:', error);
    root.innerHTML = errorState(error.message);
  }
}

function renderQuiz(root, lesson, questions) {
  root.innerHTML = `
    <div class="section-heading-row">
      <h2 class="section-heading">🎯 Practice: ${escapeHtml(lesson.title)}</h2>
      <a href="lesson.html?id=${encodeURIComponent(lesson.id)}" class="btn btn-ghost btn-sm">← Read lesson</a>
    </div>

    <div class="card" style="padding:0.8rem 1rem; margin-bottom:1rem; text-align:center;">
      <div style="color:var(--text-secondary); font-size:0.85rem;">
        ${questions.length} questions · Instant feedback
      </div>
    </div>

    <form id="quiz-form">
      ${questions.map((q, i) => renderQuestionCard(q, i)).join('')}

      <div class="form-actions" style="justify-content:center; margin-top:1.5rem;">
        <button type="submit" class="btn btn-gold btn-lg" id="submit-quiz">
          ✅ Check my answers
        </button>
      </div>
    </form>
  `;

  // Track selections
  root.querySelectorAll('input[type="radio"]').forEach(input => {
    input.addEventListener('change', (e) => {
      const qid = e.target.name.replace('q-', '');
      currentAnswers[qid] = e.target.value;
    });
  });

  document.getElementById('quiz-form').addEventListener('submit', (e) => {
    e.preventDefault();
    submitQuiz(lesson, questions);
  });
}

function renderQuestionCard(q, index) {
  const options = ['A', 'B', 'C', 'D'];
  const labels = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d };

  return `
    <div class="question-card" data-qid="${escapeHtml(q.id)}">
      <div class="question-head">
        <span class="question-num">Q${index + 1}</span>
        <span class="question-diff diff-${escapeHtml(q.difficulty)}">${escapeHtml(q.difficulty)}</span>
      </div>
      <div class="question-prompt">${escapeHtml(q.prompt)}</div>
      <div class="question-options">
        ${options.map(opt => `
          <label class="question-option">
            <input type="radio" name="q-${escapeHtml(q.id)}" value="${opt}">
            <span class="option-letter">${opt}</span>
            <span class="option-text">${escapeHtml(labels[opt])}</span>
          </label>
        `).join('')}
      </div>
      <div class="question-feedback" style="display:none;"></div>
    </div>
  `;
}

// ============================================================
// SUBMIT + SCORE
// ============================================================

async function submitQuiz(lesson, questions) {
  const btn = document.getElementById('submit-quiz');
  btn.disabled = true;
  btn.textContent = 'Checking...';

  let correct = 0;
  const breakdown = [];

  questions.forEach(q => {
    const chosen = currentAnswers[q.id] || null;
    const isCorrect = chosen === q.correct_option;
    if (isCorrect) correct++;

    breakdown.push({ question_id: q.id, chosen, correct: isCorrect });

    // Show feedback inline
    const card = document.querySelector(`.question-card[data-qid="${q.id}"]`);
    if (!card) return;

    const feedback = card.querySelector('.question-feedback');
    const options = card.querySelectorAll('.question-option');

    options.forEach(opt => {
      const letter = opt.querySelector('input').value;
      opt.classList.remove('correct', 'wrong');
      if (letter === q.correct_option) opt.classList.add('correct');
      if (letter === chosen && !isCorrect) opt.classList.add('wrong');
    });

    card.querySelectorAll('input').forEach(i => i.disabled = true);

    feedback.style.display = 'block';
    feedback.innerHTML = `
      <div class="fb-line ${isCorrect ? 'fb-ok' : 'fb-no'}">
        ${isCorrect ? '✅ Correct!' : `❌ Not quite — the answer is ${q.correct_option}`}
      </div>
      ${q.explanation ? `<div class="fb-explain">${escapeHtml(q.explanation)}</div>` : ''}
    `;
  });

  const scorePercent = Math.round((correct / questions.length) * 100);

  // Save attempt if logged in
  let saved = false;
  try {
    const { data: { session } } = await practiceClient.auth.getSession();
    if (session) {
      const { error } = await practiceClient.from('attempts').insert({
        user_id: session.user.id,
        lesson_id: lesson.id,
        subject: currentSubject || 'General',
        total_questions: questions.length,
        correct_answers: correct,
        score_percent: scorePercent,
        answers: breakdown
      });
      if (!error) saved = true;
    }
  } catch (e) {
    console.warn('Could not save attempt:', e);
  }

  renderResults(lesson, questions.length, correct, scorePercent, saved);
}

function renderResults(lesson, total, correct, percent, saved) {
  const root = document.getElementById('practice-content');
  const message = percent >= 80 ? '🌟 Excellent work!' :
                  percent >= 60 ? '👍 Good job!' :
                  percent >= 40 ? '💪 Keep practising!' :
                  '📚 Time to review this topic.';

  const banner = document.createElement('div');
  banner.className = 'result-banner';
  banner.innerHTML = `
    <div class="result-score">${percent}%</div>
    <div class="result-message">${message}</div>
    <div class="result-detail">${correct} of ${total} correct</div>
    ${saved ? `<div class="result-saved">✓ Saved to your dashboard</div>` :
              `<div class="result-saved"><a href="login.html">Log in</a> to save your progress</div>`}
    <div class="result-actions">
      <a href="lesson.html?id=${encodeURIComponent(lesson.id)}" class="btn btn-gold">📖 Review the lesson</a>
      <a href="practice.html?subject=${encodeURIComponent(currentSubject || '')}" class="btn btn-secondary">🔁 Try another topic</a>
    </div>
  `;

  root.insertBefore(banner, root.firstChild);
  banner.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function errorState(msg) {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">⚠</div>
      <h3>Something went wrong</h3>
      <p>${escapeHtml(msg)}</p>
      <a href="practice.html" class="btn btn-gold">Back to Practice</a>
    </div>`;
}

// ============================================================
// PAGE LOAD
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  initPractice();
});