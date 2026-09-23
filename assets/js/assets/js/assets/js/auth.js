/* ============================================================
   EDUVILLE 2.0 — AUTH.JS
   Login, Signup, and Session management with Supabase
   ============================================================ */

// Initialize Supabase client
const { createClient } = supabase;
const authClient = createClient(
  EDUVILLE_CONFIG.SUPABASE_URL,
  EDUVILLE_CONFIG.SUPABASE_ANON_KEY
);

// ============================================================
// HELPERS
// ============================================================

function showError(message) {
  const box = document.getElementById('error-box');
  if (!box) {
    alert(message);
    return;
  }
  box.textContent = message;
  box.classList.add('show');
  // Scroll to top so user sees it
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
  const role = document.querySelector('input[name="role"]:checked').value;

  // Validate
  if (password.length < 6) {
    showError('⚠️ Password must be at least 6 characters.');
    return;
  }

  setLoading('signup-btn', true);

  try {
    // Create the user with Supabase Auth
    const { data, error } = await authClient.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: name,
          role: role
        }
      }
    });

    if (error) throw error;

    if (!data.user) {
      throw new Error('Signup failed. Please try again.');
    }

    // Success — redirect to homepage
    alert(`🎓 Welcome to EduVille, ${name}!\n\nCommit to Your Future ✨`);
    window.location.href = 'index.html';

  } catch (error) {
    console.error('Signup error:', error);

    let message = error.message;
    if (message.includes('already registered') || message.includes('already exists')) {
      message = '⚠️ This email is already registered. Try logging in instead.';
    } else if (message.includes('invalid email')) {
      message = '⚠️ Please enter a valid email address.';
    } else if (message.includes('Password')) {
      message = '⚠️ Password must be at least 6 characters.';
    }

    showError(message);
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
    const { data, error } = await authClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) throw error;

    // Success — redirect to homepage
    alert('🎉 Welcome back!\n\nCommit to Your Future ✨');
    window.location.href = 'index.html';

  } catch (error) {
    console.error('Login error:', error);

    let message = error.message;
    if (message.includes('Invalid login credentials') || message.includes('invalid')) {
      message = '❌ Invalid email or password. Please try again.';
    } else if (message.includes('Email not confirmed')) {
      message = '⚠️ Please check your email to confirm your account first.';
    }

    showError(message);
    setLoading('login-btn', false, 'Login');
  }
}

// ============================================================
// SESSION MANAGEMENT
// ============================================================

// Check if user is already logged in
async function checkSession() {
  const { data: { session } } = await authClient.auth.getSession();
  return session;
}

// Update navbar if logged in
async function updateNavbarForUser() {
  const loginBtn = document.querySelector('.btn-login');
  if (!loginBtn) return;

  const session = await checkSession();
  if (!session) return;

  // Get user profile from users table
  const { data: profile } = await authClient
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single();

  const displayName = profile?.full_name?.split(' ')[0] || 'You';

  loginBtn.outerHTML = `
    <span class="user-badge" onclick="handleLogout()">
      <i data-lucide="user" style="width:14px;height:14px;"></i>
      ${displayName}
    </span>
  `;

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ============================================================
// LOGOUT
// ============================================================

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
  // Initialize Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // Update navbar if user is logged in
  updateNavbarForUser();
});
