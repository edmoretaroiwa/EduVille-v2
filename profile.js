/* ============================================================
   EDUVILLE 2.0 — PROFILE.JS
   View and edit your own profile, change password, log out
   ============================================================ */

const profileClient = window.db;

const AFRICAN_COUNTRIES = [
  'Algeria','Angola','Benin','Botswana','Burkina Faso','Burundi','Cameroon','Cape Verde',
  'Central African Republic','Chad','Comoros','Congo','DR Congo','Djibouti','Egypt',
  'Equatorial Guinea','Eritrea','Eswatini','Ethiopia','Gabon','Gambia','Ghana','Guinea',
  'Guinea-Bissau','Ivory Coast','Kenya','Lesotho','Liberia','Libya','Madagascar','Malawi',
  'Mali','Mauritania','Mauritius','Morocco','Mozambique','Namibia','Niger','Nigeria','Rwanda',
  'Sao Tome and Principe','Senegal','Seychelles','Sierra Leone','Somalia','South Africa',
  'South Sudan','Sudan','Tanzania','Togo','Tunisia','Uganda','Zambia','Zimbabwe'
];

function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function profileFieldError(id, message) {
  showFormMessage('error', message);
  const el = document.getElementById(id);
  if (el) el.focus();
}

// ============================================================
// LOAD + RENDER
// ============================================================

async function loadProfile() {
  const root = document.getElementById('profile-content');
  if (!root) return;

  try {
    const { data: { session } } = await profileClient.auth.getSession();
    if (!session) {
      root.innerHTML = accessGateHtml('login');
      return;
    }

    const { data: profile, error } = await profileClient
      .from('users')
      .select('full_name, email, role, bio, school, country, created_at')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error) throw error;

    renderProfile(root, session.user, profile || {});
  } catch (error) {
    console.error('Profile error:', error);
    root.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠</div>
        <h3>Could not load your profile</h3>
        <p>${escapeHtml(error.message)}</p>
        <a href="index.html" class="btn btn-gold">Back to Home</a>
      </div>`;
  }
}

function renderProfile(root, user, p) {
  const role = p.role || 'student';
  const name = p.full_name || user.email || 'Student';
  const email = p.email || user.email || '';
  const since = p.created_at ? formatDate(p.created_at) : '';
  const contact = escapeHtml(EDUVILLE_CONFIG.CONTACT_EMAIL);

  const teacherPanel = isTeacherRole(role)
    ? `<div class="form-card">
         <h2>🎓 Teacher tools</h2>
         <p class="form-note">Manage the content you've shared with students.</p>
         <div class="profile-links">
           <a href="teacher-dashboard.html" class="btn btn-gold btn-sm">🎓 Open Teacher Dashboard</a>
           <a href="add-video.html" class="btn btn-ghost btn-sm">+ Add Video</a>
           <a href="add-paper.html" class="btn btn-ghost btn-sm">+ Add Past Paper</a>
         </div>
       </div>`
    : `<div class="form-card">
         <h2>🎓 Become a teacher</h2>
         <p class="form-note">Teacher access is approved by the EduVille team. Email
           <a href="mailto:${contact}">${contact}</a> and tell us about yourself.</p>
       </div>`;

  root.innerHTML = `
    <div class="form-card">
      <div class="profile-head">
        <div class="profile-avatar" aria-hidden="true">${escapeHtml(getInitials(name))}</div>
        <div>
          <h2 class="profile-name">${escapeHtml(name)}<span class="role-badge">${escapeHtml(role)}</span></h2>
          <div class="profile-sub">${escapeHtml(email)}${since ? ' · Joined ' + escapeHtml(since) : ''}</div>
        </div>
      </div>
      <div class="profile-links">
        <a href="dashboard.html" class="btn btn-ghost btn-sm">📊 My Dashboard</a>
        <a href="bookmarks.html" class="btn btn-ghost btn-sm">🔖 My Bookmarks</a>
        <button type="button" class="btn btn-ghost btn-sm" id="logout-btn">Log out</button>
      </div>
    </div>

    <form class="form-card" id="profile-form" novalidate>
      <h2>Edit details</h2>
      <div class="form-msg" id="form-msg" role="status"></div>

      <div class="form-group">
        <label for="pf-email">Email</label>
        <input type="email" id="pf-email" value="${escapeHtml(email)}" readonly>
        <div class="form-hint">Contact support to change your email.</div>
      </div>
      <div class="form-group">
        <label for="pf-name">Full name</label>
        <input type="text" id="pf-name" maxlength="80" value="${escapeHtml(p.full_name || '')}" required>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label for="pf-school">School</label>
          <input type="text" id="pf-school" maxlength="100" value="${escapeHtml(p.school || '')}">
        </div>
        <div class="form-group">
          <label for="pf-country">Country</label>
          <input type="text" id="pf-country" list="country-list" maxlength="60" value="${escapeHtml(p.country || '')}">
          <datalist id="country-list">
            ${AFRICAN_COUNTRIES.map(c => `<option value="${escapeHtml(c)}">`).join('')}
          </datalist>
        </div>
      </div>
      <div class="form-group">
        <label for="pf-bio">About me</label>
        <textarea id="pf-bio" maxlength="300" placeholder="What are you studying? What are your goals?">${escapeHtml(p.bio || '')}</textarea>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-gold" id="pf-save">Save changes</button>
      </div>
    </form>

    <form class="form-card" id="password-form" novalidate>
      <h2>Change password</h2>
      <div class="form-msg" id="pw-msg" role="status"></div>
      <div class="form-group">
        <label for="pw-current">Current password</label>
        <input type="password" id="pw-current" autocomplete="current-password">
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label for="pw-new">New password</label>
          <input type="password" id="pw-new" minlength="6" autocomplete="new-password">
        </div>
        <div class="form-group">
          <label for="pw-confirm">Confirm new password</label>
          <input type="password" id="pw-confirm" minlength="6" autocomplete="new-password">
        </div>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-ghost" id="pw-save">Update password</button>
      </div>
    </form>

    ${teacherPanel}
  `;

  document.getElementById('profile-form').addEventListener('submit', (e) => saveProfile(e, user.id));
  document.getElementById('password-form').addEventListener('submit', changePassword);
  document.getElementById('logout-btn').addEventListener('click', () => handleLogout());
}

// ============================================================
// SAVE PROFILE
// ============================================================

async function saveProfile(event, userId) {
  event.preventDefault();
  hideFormMessage();

  const fullName = document.getElementById('pf-name').value.trim();
  const school = document.getElementById('pf-school').value.trim();
  const country = document.getElementById('pf-country').value.trim();
  const bio = document.getElementById('pf-bio').value.trim();

  if (fullName.length < 2) return profileFieldError('pf-name', 'Please enter your full name (at least 2 letters).');

  const btn = document.getElementById('pf-save');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const { data, error } = await profileClient
      .from('users')
      .update({
        full_name: fullName,
        school: school || null,
        country: country || null,
        bio: bio || null
      })
      .eq('id', userId)
      .select('id');

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Nothing was saved. Please log in again and retry.');

    showFormMessage('success', 'Profile saved.');
    btn.disabled = false;
    btn.textContent = 'Save changes';
  } catch (error) {
    console.error('Save profile error:', error);
    showFormMessage('error', 'Could not save your profile. Please try again.');
    btn.disabled = false;
    btn.textContent = 'Save changes';
  }
}

// ============================================================
// CHANGE PASSWORD
// ============================================================

async function changePassword(event) {
  event.preventDefault();

  const box = document.getElementById('pw-msg');
  const show = (type, text) => {
    box.className = 'form-msg show ' + type;
    box.textContent = text;
  };

  const currentPw = document.getElementById('pw-current').value;
  const newPw = document.getElementById('pw-new').value;
  const confirmPw = document.getElementById('pw-confirm').value;

  if (!currentPw) return show('error', 'Please enter your current password.');
  if (newPw.length < 6) return show('error', 'New password must be at least 6 characters.');
  if (newPw !== confirmPw) return show('error', 'The two new passwords do not match.');
  if (newPw === currentPw) return show('error', 'New password must be different from your current one.');

  const btn = document.getElementById('pw-save');
  btn.disabled = true;
  btn.textContent = 'Updating...';

  try {
    const { data: { session } } = await profileClient.auth.getSession();
    if (!session) throw new Error('No active session.');

    // Re-authenticate with current password
    const { error: reauthError } = await profileClient.auth.signInWithPassword({
      email: session.user.email,
      password: currentPw
    });
    if (reauthError) {
      show('error', 'Current password is incorrect.');
      return;
    }

    // Update to new password
    const { error: updateError } = await profileClient.auth.updateUser({ password: newPw });
    if (updateError) throw updateError;

    document.getElementById('pw-current').value = '';
    document.getElementById('pw-new').value = '';
    document.getElementById('pw-confirm').value = '';
    show('success', 'Password updated.');
  } catch (error) {
    console.error('Password error:', error);
    show('error', 'Could not update your password. Please try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Update password';
  }
}

// ============================================================
// PAGE LOAD
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  loadProfile();
});