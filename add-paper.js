/* ============================================================
   EDUVILLE 2.0 — ADD-PAPER.JS
   Teachers add a past paper. After each save the board / level
   / subject / year stay filled in for fast bulk entry.
   ============================================================ */

const addPaperClient = window.db;

function normalizeFileUrl(raw) {
  const v = String(raw || '').trim();
  if (/^https?:\/\/\S+$/i.test(v)) return v;
  if (/^[A-Za-z0-9_\-./%]+\.pdf$/i.test(v) && !v.startsWith('/') && !v.includes('..')) return v;
  return null;
}

async function initAddPaper() {
  const gate = document.getElementById('gate');
  const form = document.getElementById('paper-form');
  if (!gate || !form) return;

  try {
    const { session, role } = await getMyRole();

    if (!session) { gate.innerHTML = accessGateHtml('login'); return; }
    if (!isTeacherRole(role)) { gate.innerHTML = accessGateHtml('teacher'); return; }

    document.getElementById('p-year').max = new Date().getFullYear() + 1;
    gate.innerHTML = '';
    form.style.display = 'block';
    form.addEventListener('submit', handleAddPaper);
  } catch (error) {
    console.error('Add paper init error:', error);
    gate.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠</div>
        <h3>Something went wrong</h3>
        <p>Please refresh the page and try again.</p>
      </div>`;
  }
}

function paperFieldError(id, message) {
  showFormMessage('error', message);
  const el = document.getElementById(id);
  if (el) el.focus();
}

async function handleAddPaper(event) {
  event.preventDefault();
  hideFormMessage();

  const title = document.getElementById('p-title').value.trim();
  const board = document.getElementById('p-board').value;
  const level = document.getElementById('p-level').value;
  const subject = document.getElementById('p-subject').value.trim();
  const yearRaw = document.getElementById('p-year').value.trim();
  const paperType = document.getElementById('p-type').value;
  const fileUrl = normalizeFileUrl(document.getElementById('p-file').value);

  const year = Number(yearRaw);
  const maxYear = new Date().getFullYear() + 1;

  if (title.length < 3) return paperFieldError('p-title', 'Please enter a title (at least 3 characters).');
  if (subject.length < 2) return paperFieldError('p-subject', 'Please enter the subject.');
  if (!Number.isInteger(year) || year < 1990 || year > maxYear) {
    return paperFieldError('p-year', 'Please enter a valid year, for example 2023.');
  }
  if (!fileUrl) {
    return paperFieldError('p-file', 'Enter a full https:// link, or a PDF path like papers/zimsec/maths-2023.pdf (no spaces).');
  }

  const btn = document.getElementById('p-submit');
  btn.disabled = true;
  btn.textContent = 'Adding...';

  try {
    const { data: { session } } = await addPaperClient.auth.getSession();
if (!session) throw new Error('Please log in again and retry.');

const { error } = await addPaperClient
  .from('papers')
  .insert({
    title: title,
    exam_board: board,
    level: level,
    subject: subject,
    year: year,
    paper_type: paperType,
    file_url: fileUrl,
    author_id: session.user.id
  });

    if (error) throw error;

    showFormMessage('success', 'Paper added! Board, level, subject and year are kept for the next one.', { href: 'resources.html', text: 'View papers' });
    document.getElementById('p-title').value = '';
    document.getElementById('p-file').value = '';
    document.getElementById('p-title').focus();
  } catch (error) {
    console.error('Add paper error:', error);
    const denied = error && (error.code === '42501' || /row-level security/i.test(error.message || ''));
    showFormMessage('error', denied
      ? 'You do not have permission to add papers with this account.'
      : 'Could not add the paper. Please check the details and try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add Paper';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  initAddPaper();
});