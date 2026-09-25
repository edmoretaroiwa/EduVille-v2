/* ============================================================
   EDUVILLE 2.0 — TYMERCRE.JS
   Chat with the AI Tutor via Supabase Edge Function
   ============================================================ */

const { createClient } = supabase;
const chatClient = createClient(
  EDUVILLE_CONFIG.SUPABASE_URL,
  EDUVILLE_CONFIG.SUPABASE_ANON_KEY
);

// ============================================================
// STATE
// ============================================================

let isProcessing = false;
let conversationHistory = []; // { role: 'user'|'model', text: string }

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
    const { data: { session } } = await chatClient.auth.getSession();
    let userName = 'Student';
    if (session) {
      const { data: profile } = await chatClient
        .from('users')
        .select('full_name')
        .eq('id', session.user.id)
        .single();
      if (profile?.full_name) userName = profile.full_name;
    }

    const { data, error } = await chatClient.functions.invoke('ask-tymercre', {
      body: {
        message: message,
        userName: userName,
        subject: 'General',
        history: conversationHistory.slice(-6)
      }
    });

    typingEl.remove();

    if (error) throw error;

    if (data?.error) {
      throw new Error(data.error);
    }

    const response = data?.response || "Sorry, I couldn't respond right now.";
    addMessage('bot', response);
    conversationHistory.push({ role: 'model', text: response });

  } catch (error) {
    console.error('TymerCRE error:', error);
    typingEl.remove();

    let msg = 'Unknown error';
    if (error) {
      if (typeof error === 'string') {
        msg = error;
      } else if (error.message) {
        msg = error.message;
      } else if (error.error) {
        msg = error.error;
      } else {
        try { msg = JSON.stringify(error); } catch (e) { msg = 'Error object'; }
      }
    }

    if (msg.includes('not found') || msg.includes('404')) {
      msg = '🚧 TymerCRE is not deployed yet.';
    } else if (msg.includes('Network') || msg.includes('Failed to fetch')) {
      msg = '📶 Network error. Check your internet.';
    } else if (msg.includes('not configured')) {
      msg = '⚙️ AI not configured. Check Supabase secret.';
    }

    addMessage('bot', `⚠️ ${msg}`);

  } finally {
    isProcessing = false;
    sendBtn.disabled = false;
    document.getElementById('chat-input').focus();
  }
}

// ============================================================
// ADD MESSAGE TO CHAT
// ============================================================

function addMessage(role, text) {
  const messages = document.getElementById('chat-messages');

  const welcome = messages.querySelector('.welcome-block');
  if (welcome) welcome.remove();

  const msg = document.createElement('div');
  msg.className = `message ${role}`;

  const avatarIcon = role === 'bot' ? '🤖' : '👤';

  msg.innerHTML = `
    <div class="message-avatar">${avatarIcon}</div>
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
    <div class="typing">
      <span></span><span></span><span></span>
    </div>
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

// ============================================================
// PAGE LOAD
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  document.getElementById('chat-input').focus();
});
