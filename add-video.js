/* ============================================================
   EDUVILLE 2.0 — ADD-VIDEO.JS
   Teachers add a YouTube lesson.
   ============================================================ */

const addVideoClient = window.db;

// Accepts watch, youtu.be, embed, shorts and live links (11-char ID)
function getYouTubeId(url) {
  if (!url) return null;
  const m = String(url).trim().match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtube-nocookie\.com\/embed\/)([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])/
  );
  return m ? m[1] : null;
}

async function initAddVideo() {
  const gate = document.getElementById('gate');
  const form = document.getElementById('video-form');
  if (!gate || !form) return;

  try {
    const { session, role } = await getMyRole();

    if (!session) { gate.innerHTML = accessGateHtml('login'); return; }
    if (!isTeacherRole(role)) { gate.innerHTML = accessGateHtml('teacher'); return; }

    const { data: profile } = await addVideoClient
      .from('users').select('full_name').eq('id', session.user.id).maybeSingle();

    document.getElementById('v-author').value = (profile && profile.full_name) || '';

    gate.innerHTML = '';
    form.style.display = 'block';
    form.addEventListener('submit', (e) => handleAddVideo(e, session.user.id));
  } catch (error) {
    console.error('Add video init error:', error);
    gate.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠</div>
        <h3>Something went wrong</h3>
        <p>Please refresh the page and try again.</p>
      </div>`;
  }
}

function videoFieldError(id, message) {
  showFormMessage('error', message);
  const el = document.getElementById(id);
  if (el) el.focus();
}

async function handleAddVideo(event, userId) {
  event.preventDefault();
  hideFormMessage();

  const title = document.getElementById('v-title').value.trim();
  const url = document.getElementById('v-url').value.trim();
  const course = document.getElementById('v-course').value;
  const duration = document.getElementById('v-duration').value.trim();
  const author = document.getElementById('v-author').value.trim();

  if (title.length < 3) return videoFieldError('v-title', 'Please enter a title (at least 3 characters).');

  const ytId = getYouTubeId(url);
  if (!ytId) return videoFieldError('v-url', 'That does not look like a YouTube link. Copy it from the Share button on YouTube.');

  if (duration && !/^\d{1,2}(:\d{2}){1,2}$/.test(duration)) {
    return videoFieldError('v-duration', 'Write the length like 12:30 (minutes:seconds).');
  }
  if (author.length < 2) return videoFieldError('v-author', 'Please enter the presenter name.');

  const btn = document.getElementById('v-submit');
  btn.disabled = true;
  btn.textContent = 'Adding...';

  try {
    const { data, error } = await addVideoClient
      .from('videos')
      .insert({
        title: title,
        course: course,
        embed_url: 'https://www.youtube.com/embed/' + ytId,
        original_url: url,
        duration: duration || null,
        author: author,
        author_id: userId
      })
      .select('id')
      .single();

    if (error) throw error;

    showFormMessage('success', 'Video added!', { href: 'video.html?id=' + encodeURIComponent(data.id), text: 'View it' });
    document.getElementById('v-title').value = '';
    document.getElementById('v-url').value = '';
    document.getElementById('v-duration').value = '';
    document.getElementById('v-title').focus();
  } catch (error) {
    console.error('Add video error:', error);
    const denied = error && (error.code === '42501' || /row-level security/i.test(error.message || ''));
    showFormMessage('error', denied
      ? 'You do not have permission to add videos with this account.'
      : 'Could not add the video. Please check the details and try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add Video';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  initAddVideo();
});