// ---------- COMMUNITY CHAT ----------
// Backed by Firebase Realtime Database (free tier). See firebase-config.js
// for one-time setup — until that's filled in with real project keys,
// this shows a friendly "not connected yet" message instead of erroring.

(function () {
  const chatBox = document.getElementById('chatBox');
  if (!chatBox) return; // only community.html has a chat box

  const statusEl = document.getElementById('chatStatus');
  const messagesEl = document.getElementById('chatMessages');
  const formEl = document.getElementById('chatForm');
  const nameInput = document.getElementById('chatName');
  const textInput = document.getElementById('chatText');

  const MAX_NAME_LEN = 20;
  const MAX_TEXT_LEN = 240;
  const SEND_COOLDOWN_MS = 1500; // basic anti-spam: one message per 1.5s
  let lastSendAt = 0;

  // Escape untrusted text before ever putting it in the DOM. Messages are
  // rendered via textContent below (not innerHTML), which already prevents
  // HTML injection — this is a second layer of defense in case that ever
  // changes during future edits.
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function renderMessage(msg) {
    const row = document.createElement('div');
    row.className = 'chat-message';

    const meta = document.createElement('div');
    meta.className = 'chat-message-meta';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'chat-message-name';
    nameSpan.textContent = msg.name; // textContent, not innerHTML — safe from injection

    const timeSpan = document.createElement('span');
    timeSpan.className = 'chat-message-time';
    timeSpan.textContent = formatTime(msg.ts);

    meta.appendChild(nameSpan);
    meta.appendChild(timeSpan);

    const textDiv = document.createElement('div');
    textDiv.className = 'chat-message-text';
    textDiv.textContent = msg.text; // textContent, not innerHTML — safe from injection

    row.appendChild(meta);
    row.appendChild(textDiv);
    messagesEl.appendChild(row);

    // auto-scroll to newest message
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function isConfigured() {
    return typeof FIREBASE_CONFIG !== 'undefined' &&
      FIREBASE_CONFIG.apiKey &&
      FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY';
  }

  if (!isConfigured()) {
    statusEl.textContent = 'Chat not connected yet — see firebase-config.js for setup.';
    statusEl.classList.add('chat-status-error');
    formEl.querySelectorAll('input, button').forEach(el => el.disabled = true);
    return;
  }

  let db;
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.database();
  } catch (err) {
    statusEl.textContent = 'Could not connect to chat. Check your Firebase config.';
    statusEl.classList.add('chat-status-error');
    formEl.querySelectorAll('input, button').forEach(el => el.disabled = true);
    return;
  }

  const chatRef = db.ref('community-chat').limitToLast(50);

  chatRef.on('child_added', (snapshot) => {
    const msg = snapshot.val();
    if (!msg || typeof msg.name !== 'string' || typeof msg.text !== 'string') return;
    renderMessage(msg);
  });

  chatRef.once('value', () => {
    statusEl.textContent = '';
    statusEl.classList.remove('chat-status-error');
  });

  db.ref('.info/connected').on('value', (snap) => {
    if (snap.val() === false) {
      statusEl.textContent = 'Disconnected — trying to reconnect…';
      statusEl.classList.add('chat-status-error');
    }
  });

  formEl.addEventListener('submit', (e) => {
    e.preventDefault();

    const now = Date.now();
    if (now - lastSendAt < SEND_COOLDOWN_MS) return; // silently ignore rapid double-sends

    const name = nameInput.value.trim().slice(0, MAX_NAME_LEN);
    const text = textInput.value.trim().slice(0, MAX_TEXT_LEN);
    if (!name || !text) return;

    lastSendAt = now;

    db.ref('community-chat').push({
      name,
      text,
      ts: now
    }).catch(() => {
      statusEl.textContent = 'Message failed to send — try again.';
      statusEl.classList.add('chat-status-error');
    });

    textInput.value = '';
    textInput.focus();
  });
})();