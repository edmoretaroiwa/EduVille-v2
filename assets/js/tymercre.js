/* ============================================================
   EDUVILLE 2.0 — TYMERCRE.JS
   Bulletproof version with visible debugging
   ============================================================ */

// Reuse the Supabase client already created by app.js
const chatClient = window.db;

let isProcessing = false;
let conversationHistory = [];

// ============================================================
// SEND MESSAGE
// ============================================================

const LOGIN_MESSAGE = '🔐 Please log in to chat with TymerCRE. It is free! Tap Login at the top of the page.';
const GENERIC_ERROR = '⚠️ TymerCRE could not answer just now. Please try again in a moment.';

// supabase-js hides our JSON reply inside error.context when the status is not 200
async function readErrorInfo(error) {
  try {
    if (error && error.context && typeof error.context.json === 'function') {
      return await error.context.json();
    }
  } catch (e) { /* not JSON, fall through */ }
  return null;
}

function friendlyMessage(info) {
  if (!info) return GENERIC_ERROR;
  if (info.code === 'login_required') return LOGIN_MESSAGE;
  if (info.error && ['rate_limited', 'too_long', 'ai_unavailable'].includes(info.code)) {
    return '⚠️ ' + info.error;
  }
  return GENERIC_ERROR;
}

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
    // TymerCRE is for logged-in students. Check first to save a round trip.
    const { data: { session } } = await chatClient.auth.getSession();
    if (!session) {
      typingEl.remove();
      addMessage('bot', LOGIN_MESSAGE);
      return;
    }

    // The server reads the student's name from the database, so we don't send it.
    const { data, error } = await chatClient.functions.invoke('ask-tymercre', {
      body: {
        message: message,
        subject: 'General',
        history: conversationHistory.slice(-7)
      }
    });

    typingEl.remove();

    if (error) {
      console.error('TymerCRE error:', error);
      addMessage('bot', friendlyMessage(await readErrorInfo(error)));
      return;
    }

    if (data?.response) {
      addMessage('bot', data.response);
      conversationHistory.push({ role: 'model', text: data.response });
    } else {
      addMessage('bot', GENERIC_ERROR);
    }

  } catch (error) {
    console.error('TymerCRE exception:', error);
    if (typingEl && typingEl.parentNode) typingEl.remove();
    addMessage('bot', GENERIC_ERROR);
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