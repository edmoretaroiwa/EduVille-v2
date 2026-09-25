/* ============================================================
   EDUVILLE 2.0 — TYMERCRE.JS
   Bulletproof version with visible debugging
   ============================================================ */

const { createClient } = supabase;
const chatClient = createClient(
  EDUVILLE_CONFIG.SUPABASE_URL,
  EDUVILLE_CONFIG.SUPABASE_ANON_KEY
);

let isProcessing = false;
let conversationHistory = [];

// ============================================================
// SEND MESSAGE
// ============================================================

async function sendMessage(event) {
  if (event) event.preventDefault();
  if (isProcessing) return;

  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');
  const message = input.value.trim();

  if (!message) return;

  input.value = '';
  input.style.height = 'auto';

  addMessage('user', message);
  conversationHistory.push({ role: 'user', text: message });

  isProcessing = true;
  sendBtn.disabled = true;
  const typingEl = showTyping();

  try {
    // Get user info (optional)
    let userName = 'Student';
    try {
      const { data: { session } } = await chatClient.auth.getSession();
      if (session) {
        const { data: profile } = await chatClient
          .from('users')
          .select('full_name')
          .eq('id', session.user.id)
          .single();
        if (profile?.full_name) userName = profile.full_name;
      }
    } catch (e) {
      console.log('Session check failed (OK):', e);
    }

    // Call the function
    console.log('📤 Calling ask-tymercre with:', { message, userName });

    const { data, error } = await chatClient.functions.invoke('ask-tymercre', {
      body: {
        message: message,
        userName: userName,
        subject: 'General',
        history: conversationHistory.slice(-6)
      }
    });

    console.log('📥 Raw response:', { data, error });

    typingEl.remove();

    if (error) {
      addMessage('bot', `⚠️ Function error: ${error.message || JSON.stringify(error)}`);
      return;
    }

    if (data?.error) {
      addMessage('bot', `⚠️ AI error: ${data.error}`);
      return;
    }

    if (data?.response) {
      addMessage('bot', data.response);
      conversationHistory.push({ role: 'model', text: data.response });
    } else {
      addMessage('bot', `⚠️ No response from AI. Got: ${JSON.stringify(data)}`);
    }

  } catch (error) {
    console.error('💥 Exception:', error);
    if (typingEl && typingEl.parentNode) typingEl.remove();

    let msg = 'Unknown error';
    if (typeof error === 'string') msg = error;
    else if (error?.message) msg = error.message;
    else {
      try { msg = JSON.stringify(error); } catch (e) { msg = 'Error'; }
    }

    addMessage('bot', `💥 Exception: ${msg}`);
  } finally {
    isProcessing = false;
    sendBtn.disabled = false;
    document.getElementById('chat-input').focus();
  }
}

// ============================================================
// ADD MESSAGE
// ============================================================

function addMessage(role, text) {
  const messages = document.getElementById('chat-messages');
  const welcome = messages.querySelector('.welcome-block');
  if (welcome) welcome.remove();

  const msg = document.createElement('div');
  msg.className = `message ${role}`;
  msg.innerHTML = `
    <div class="message-avatar">${role === 'bot' ? '🤖' : '👤'}</div>
    <div class="message-bubble">${escapeHtml(text)}</div>
  `;
  messages.appendChild(msg);
  messages.scrollTop = messages.scrollHeight;
}

// ============================================================
// TYPING INDICATOR
// ============================================================

function showTyping() {
  const messages = document.getElementById('chat-messages');
  const welcome = messages.querySelector('.welcome-block');
  if (welcome) welcome.remove();

  const el = document.createElement('div');
  el.className = 'message bot';
  el.id = 'typing-indicator';
  el.innerHTML = `
    <div class="message-avatar">🤖</div>
    <div class="typing"><span></span><span></span><span></span></div>
  `;
  messages.appendChild(el);
  messages.scrollTop = messages.scrollHeight;
  return el;
}

// ============================================================
// HELPERS
// ============================================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function handleKeyDown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage(event);
  }
}

function autoResize(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
}

function askSuggestion(text) {
  document.getElementById('chat-input').value = text;
  sendMessage();
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  document.getElementById('chat-input').focus();
});
