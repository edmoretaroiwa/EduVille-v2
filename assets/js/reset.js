/* ============================================================
   EDUVILLE 2.0 — RESET.JS
   Password reset: request email + set new password
   ============================================================ */

const resetClient = window.db;

// ============================================================
// HELPERS
// ============================================================

function resetMsg(type, text) {
  const box = document.getElementById('form-msg') || document.querySelector('.form-msg');
  if (!box) { alert(text); return; }
  box.className = 'form-msg show ' + type;
  box.textContent = text;
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ============================================================
// FORGOT PASSWORD — request the reset email
// Runs when the #forgot-form is present
// ============================================================

async function initForgotPassword() {
  const form = document.getElementById('forgot-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('fp-email').value.trim();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return resetMsg('error', 'Please enter a valid email address.');
    }

    const btn = document.getElementById('fp-submit');
    btn.disabled = true;
    btn.textContent = 'Sending...';

    try {
      const redirectTo = window.location.origin + '/reset-password.html';

      const { error } = await resetClient.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo
      });

      if (error) throw error;

      // Always show the same message, whether the email exists or not,
      // so we don't reveal which emails have accounts.
      resetMsg('success', 'If that email is registered, a reset link is on its way. Check your inbox and spam folder.');

      form.reset();
    } catch (error) {
      console.error('Forgot password error:', error);
      // Rate limit is the only failure worth surfacing differently
      if (/rate limit|too many/i.test(error.message || '')) {
        resetMsg('error', 'Too many requests. Please wait a few minutes and try again.');
      } else {
        resetMsg('error', 'Could not send the reset email. Please try again.');
      }
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send reset link';
    }
  });
}

// ============================================================
// RESET PASSWORD — set the new password
// Runs on reset-password.html
//
// Supabase sends the user to this page with a URL containing
// either a `code` (PKCE flow) or `access_token` + `refresh_token`
// (implicit flow) in the hash fragment. Either way, the
// Supabase client detects the session automatically.
// ============================================================

async function initResetPassword() {
  const root = document.getElementById('reset-content');
  if (!root) return;

  // The URL may still be processing. Give it a moment.
  await new Promise((resolve) => setTimeout(resolve, 400));

  const { data: { session } } = await resetClient.auth.getSession();

  if (!session) {
    root.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠</div>
        <h3>Link invalid or expired</h3>
        <p>The reset link has already been used, or it has expired. Request a new one to continue.</p>
        <a href="forgot-password.html" class="btn btn-gold">Request a new link</a>
        <a href="login.html" class="btn btn-ghost">Back to login</a>
      </div>
    `;
    return;
  }

  // Session is valid — show the new-password form
  root.innerHTML = `
    <div class="form-msg" id="form-msg" role="status"></div>

    <form class="form-card" id="reset-form" novalidate style="background:transparent; border:none; padding:0; margin:0;">
      <h2 style="text-align:center;">Set a new password</h2>
      <p class="form-note" style="text-align:center;">
        Choose a password you'll remember. At least 6 characters.
      </p>

      <div class="form-group">
        <label for="rp-new">New password</label>
        <input type="password" id="rp-new" minlength="6" autocomplete="new-password" required>
      </div>

      <div class="form-group">
        <label for="rp-confirm">Confirm new password</label>
        <input type="password" id="rp-confirm" minlength="6" autocomplete="new-password" required>
      </div>

      <div class="form-actions" style="justify-content:center;">
        <button type="submit" class="btn btn-gold" id="rp-submit" style="width:100%;">
          Update password
        </button>
      </div>
    </form>

    <p class="form-note" style="text-align:center; margin-top:1.2rem;">
      <a href="login.html">Back to login</a>
    </p>
  `;

  document.getElementById('reset-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const newPw = document.getElementById('rp-new').value;
    const confirmPw = document.getElementById('rp-confirm').value;

    if (newPw.length < 6) return resetMsg('error', 'Password must be at least 6 characters.');
    if (newPw !== confirmPw) return resetMsg('error', 'The two passwords do not match.');

    const btn = document.getElementById('rp-submit');
    btn.disabled = true;
    btn.textContent = 'Updating...';

    try {
      const { error } = await resetClient.auth.updateUser({ password: newPw });
      if (error) throw error;

      // Sign out so the user logs in fresh with the new password
      await resetClient.auth.signOut();

      root.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">✅</div>
          <h3>Password updated</h3>
          <p>Your new password is saved. Log in with it now.</p>
          <a href="login.html" class="btn btn-gold">Go to Login</a>
        </div>
      `;
    } catch (error) {
      console.error('Reset password error:', error);
      resetMsg('error', 'Could not update your password. The link may have expired — request a new one.');
      btn.disabled = false;
      btn.textContent = 'Update password';
    }
  });
}

// ============================================================
// PAGE LOAD
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  initForgotPassword();
  initResetPassword();
});