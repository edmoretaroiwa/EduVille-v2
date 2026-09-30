/* ============================================================
   EDUVILLE 2.0 — AUTH.JS
   Login, Signup, Session management
   ============================================================ */

const authClient = window.db;

// ============================================================
// HELPERS
// ============================================================

function showError(message) {
  const box = document.getElementById('error-box');
  if (!box) { alert(message); return; }
  box.textContent = message;
  box.classList.add('show');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideError() {
  const box = document.getElementById('error-box');
  if (box) box.classList.remove('show');
}

function setLoading(buttonId, isLoading, originalText) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  if (isLoading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.textContent;
    btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;"></span> Loading...';
  } else {
    btn.disabled = false;
    btn.textContent = originalText || btn.dataset.originalText || 'Submit';
  }
}

// ============================================================
// SIGNUP
// ============================================================

async function handleSignup(event) {
  event.preventDefault();
  hideError();

  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const role = document.querySelector('input[name="role"]:checked')?.value || 'student';

  if (password.length < 6) {
    showError('⚠️ Password must be at least 6 characters.');
    return;
  }

  setLoading('signup-btn', true);

  try {
    const { data, error } = await authClient.auth.signUp({
      email: email,
      password: password,
      options: { data: { full_name: name, role: role } }
    });

    if (error) throw error;
    if (!data.user) throw new Error('Signup failed. Please try again.');

    alert(`🎓 Welcome to EduVille, ${name}!\n\nCommit to Your Future ✨`);
    window.location.href = 'index.html';

  } catch (error) {
    console.error('Signup error:', error);
    let msg = error.message;
    if (msg.includes('already registered') || msg.includes('already exists')) {
      msg = '⚠️ This email is already registered. Try logging in.';
    }
    showError(msg);
    setLoading('signup-btn', false, 'Create Account');
  }
}

// ============================================================
// LOGIN
// ============================================================

async function handleLogin(event) {
  event.preventDefault();
  hideError();

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  setLoading('login-btn', true);

  try {
    const { error } = await authClient.auth.signInWithPassword({ email, password });
    if (error) throw error;

    alert('🎉 Welcome back!\n\nCommit to Your Future ✨');
    window.location.href = 'index.html';

  } catch (error) {
    console.error('Login error:', error);
    let msg = error.message;
    if (msg.includes('Invalid login credentials') || msg.includes('invalid')) {
      msg = '❌ Invalid email or password.';
    } else if (msg.includes('Email not confirmed')) {
      msg = '⚠️ Please check your email to confirm your account.';
    }
    showError(msg);
    setLoading('login-btn', false, 'Login');
  }
}

// ============================================================
// SESSION + NAVBAR
// ============================================================

async function updateNavbarForUser() {
  const loginBtn = document.querySelector('.btn-login');
  if (!loginBtn) return;

  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return;

  const { data: profile } = await authClient
    .from('users')
    .select('full_name')
    .eq('id', session.user.id)
    .single();

  const firstName = (profile?.full_name || session.user.email || 'You').split(' ')[0];

  loginBtn.outerHTML = `
    <span class="user-badge" onclick="handleLogout()">
      <i data-lucide="user" style="width:14px;height:14px;"></i>
      ${escapeHtml(firstName)}
    </span>
  `;

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function handleLogout() {
  if (!confirm('Log out of EduVille?')) return;
  await authClient.auth.signOut();
  alert('👋 You have been logged out.\n\nSee you soon!');
  window.location.href = 'index.html';
}

// ============================================================
// PAGE LOAD
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  updateNavbarForUser();
});
// ============================================================
// SHARED — role helpers (used by profile, add-video, add-paper)
// ============================================================

/**
 * Returns { session, role } for the current user.
 * role is read from the users table, defaulting to 'student'.
 */
async function getMyRole() {
  try {
    const { data: { session } } = await authClient.auth.getSession();
    if (!session) return { session: null, role: null };

    const { data: profile } = await authClient
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle();

    return { session, role: (profile && profile.role) || 'student' };
  } catch (e) {
    console.error('getMyRole error:', e);
    return { session: null, role: null };
  }
}

function isTeacherRole(role) {
  return role === 'teacher' || role === 'admin';
}

/**
 * Returns an HTML block telling the user why they can't access a page.
 * mode: 'login' | 'teacher'
 */
function accessGateHtml(mode) {
  if (mode === 'teacher') {
    const contact = escapeHtml(EDUVILLE_CONFIG.CONTACT_EMAIL);
    return `
      <div class="empty-state">
        <div class="empty-state-icon">🎓</div>
        <h3>Teacher access only</h3>
        <p>This page is only for teachers. Email
          <a href="mailto:${contact}">${contact}</a>
          to request teacher access.</p>
        <a href="index.html" class="btn btn-gold">Back to Home</a>
      </div>`;
  }
  return `
    <div class="empty-state">
      <div class="empty-state-icon">🔐</div>
      <h3>Please log in</h3>
      <p>You need an account to view this page.</p>
      <a href="login.html" class="btn btn-gold">Log in</a>
      <a href="signup.html" class="btn btn-secondary">Create account</a>
    </div>`;
}

// ============================================================
// SHARED — form message helpers (used by all new form pages)
// ============================================================

/**
 * Shows a message in #form-msg (or the first .form-msg on the page).
 * type: 'error' | 'success'
 * link: optional { href, text } to render an inline action link
 */
function showFormMessage(type, text, link) {
  const box = document.getElementById('form-msg') || document.querySelector('.form-msg');
  if (!box) { alert(text); return; }

  box.className = 'form-msg show ' + type;
  box.innerHTML = escapeHtml(text) +
    (link ? ` <a href="${safeUrl(link.href)}">${escapeHtml(link.text)}</a>` : '');
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideFormMessage() {
  const box = document.getElementById('form-msg') || document.querySelector('.form-msg');
  if (box) { box.classList.remove('show'); box.textContent = ''; }
}