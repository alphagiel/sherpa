// ── Model definitions ───────────────────────────────────────
const MODELS = {
  'claude-haiku-4-5-20251001': { label: 'Haiku',        provider: 'anthropic', icon: '🔮' },
  'claude-sonnet-4-6':         { label: 'Sonnet',       provider: 'anthropic', icon: '🔮' },
  'claude-opus-4-8':           { label: 'Opus',         provider: 'anthropic', icon: '🔮' },
  'gpt-4o-mini':               { label: 'GPT-4o mini',  provider: 'openai',    icon: '⚡' },
  'gpt-4o':                    { label: 'GPT-4o',       provider: 'openai',    icon: '⚡' },
  'gemini-2.0-flash-exp':      { label: 'Gemini Flash', provider: 'google',    icon: '✦' },
  'gemini-1.5-pro':            { label: 'Gemini Pro',   provider: 'google',    icon: '✦' },
};

const PROVIDER_KEY_PLACEHOLDER = {
  anthropic: 'sk-ant-api03-...',
  openai:    'sk-...',
  google:    'AIza...',
};

// ── State ───────────────────────────────────────────────────
let selectedModelId = 'claude-sonnet-4-6';
let apiKeys = { anthropic: '', openai: '', google: '' };
let screenshotDataUrl = null;
let screenshotViewport = null; // { width, height } at capture time
let conversationHistory = [];
let pendingModelSwitch = null; // { modelId, provider } waiting for key entry
let captureMode = false; // whether C key is enabled for capturing

// ── DOM refs ────────────────────────────────────────────────
const setupScreen    = document.getElementById('setup-screen');
const setupDesc      = document.getElementById('setup-desc');
const apiKeyInput    = document.getElementById('api-key-input');
const saveKeyBtn     = document.getElementById('save-key-btn');
const messagesEl     = document.getElementById('messages');
const inputArea      = document.getElementById('input-area');
const captureBtn     = document.getElementById('capture-btn');
const screenshotThumb= document.getElementById('screenshot-thumb');
const screenshotLabel= document.getElementById('screenshot-label');
const removeScreenBtn= document.getElementById('remove-screenshot');
const userInput      = document.getElementById('user-input');
const sendBtn        = document.getElementById('send-btn');
const clearBtn       = document.getElementById('clear-btn');
const captureModeToggle = document.getElementById('capture-mode-toggle');

const modelBtn       = document.getElementById('model-btn');
const modelDropdown  = document.getElementById('model-dropdown');
const modelNameLabel = document.getElementById('model-name-label');
const modelProvIcon  = document.getElementById('model-provider-icon');

const keyModal       = document.getElementById('key-modal');
const keyModalTitle  = document.getElementById('key-modal-title');
const keyModalDesc   = document.getElementById('key-modal-desc');
const keyModalInput  = document.getElementById('key-modal-input');
const keyModalSave   = document.getElementById('key-modal-save');
const keyModalCancel = document.getElementById('key-modal-cancel');

// ── Init ────────────────────────────────────────────────────
chrome.storage.local.get(['sherpaApiKeys', 'sherpaModelId'], (data) => {
  if (data.sherpaApiKeys) apiKeys = { ...apiKeys, ...data.sherpaApiKeys };
  if (data.sherpaModelId) selectedModelId = data.sherpaModelId;

  updateModelBtn(selectedModelId);

  const provider = MODELS[selectedModelId].provider;
  if (apiKeys[provider]) {
    showChatUI();
  } else {
    showSetupScreen(provider);
  }
});

function showSetupScreen(provider) {
  const providerName = { anthropic: 'Anthropic', openai: 'OpenAI', google: 'Google' }[provider];
  setupDesc.innerHTML = `Paste your ${providerName} API key to get started.<br/>Stored locally — never sent anywhere except the AI provider.`;
  apiKeyInput.placeholder = PROVIDER_KEY_PLACEHOLDER[provider];
  apiKeyInput.value = '';
  setupScreen.style.display = 'flex';
  messagesEl.style.display = 'none';
  inputArea.style.display = 'none';
}

function showChatUI() {
  setupScreen.style.display = 'none';
  messagesEl.style.display = 'flex';
  inputArea.style.display = 'flex';
}

// ── Setup screen save ────────────────────────────────────────
saveKeyBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key) { apiKeyInput.style.borderColor = '#FF4444'; return; }
  const provider = MODELS[selectedModelId].provider;
  apiKeys[provider] = key;
  chrome.storage.local.set({ sherpaApiKeys: apiKeys }, () => {
    showChatUI();
    appendSystemMessage('Ready! Capture your screen and ask Sherpa anything about this page.');
  });
});

// ── Model selector ──────────────────────────────────────────
modelBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  modelDropdown.classList.toggle('open');
});

document.addEventListener('click', () => modelDropdown.classList.remove('open'));

document.querySelectorAll('.model-option').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const modelId = btn.dataset.model;
    const provider = btn.dataset.provider;
    modelDropdown.classList.remove('open');

    if (apiKeys[provider]) {
      switchModel(modelId);
    } else {
      openKeyModal(modelId, provider);
    }
  });
});

function switchModel(modelId) {
  selectedModelId = modelId;
  chrome.storage.local.set({ sherpaModelId: modelId });
  updateModelBtn(modelId);

  document.querySelectorAll('.model-option').forEach(b => {
    b.classList.toggle('active', b.dataset.model === modelId);
  });

  conversationHistory = [];
  appendSystemMessage(`Switched to ${MODELS[modelId].label}. New conversation started.`);
}

function updateModelBtn(modelId) {
  const m = MODELS[modelId];
  modelNameLabel.textContent = m.label;
  modelProvIcon.textContent  = m.icon;
}

// ── Key modal ────────────────────────────────────────────────
function openKeyModal(modelId, provider) {
  pendingModelSwitch = { modelId, provider };
  const providerName = { anthropic: 'Anthropic', openai: 'OpenAI', google: 'Google' }[provider];
  keyModalTitle.textContent = `Add ${providerName} API Key`;
  keyModalDesc.textContent  = `Enter your ${providerName} API key to use ${MODELS[modelId].label}.`;
  keyModalInput.placeholder = PROVIDER_KEY_PLACEHOLDER[provider];
  keyModalInput.value = '';
  keyModal.classList.add('open');
  setTimeout(() => keyModalInput.focus(), 50);
}

keyModalSave.addEventListener('click', () => {
  const key = keyModalInput.value.trim();
  if (!key) { keyModalInput.style.borderColor = '#FF4444'; return; }
  const { modelId, provider } = pendingModelSwitch;
  apiKeys[provider] = key;
  chrome.storage.local.set({ sherpaApiKeys: apiKeys });
  keyModal.classList.remove('open');
  pendingModelSwitch = null;

  const wasChatHidden = messagesEl.style.display === 'none';
  switchModel(modelId);
  if (wasChatHidden) showChatUI();
});

keyModalCancel.addEventListener('click', () => {
  keyModal.classList.remove('open');
  pendingModelSwitch = null;
});

// ── Clear markers ────────────────────────────────────────────
clearBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'CLEAR_MARKERS' });
});

// ── Warning dialog ────────────────────────────────────────
function showPrivacyWarning(callback) {
  const agreed = confirm(
    '⚠️ WARNING: Screenshots are sent to Anthropic\'s servers.\n\n' +
    'Do NOT capture:\n' +
    '• Passwords, API keys, or secrets\n' +
    '• Personal, medical, or financial data\n' +
    '• Proprietary or confidential information\n' +
    '• Anything subject to compliance (GDPR, HIPAA, etc.)\n\n' +
    'Only capture public UI for navigation guidance.\n\n' +
    'Do you understand and want to proceed?'
  );
  if (agreed) callback();
}

// ── Screenshot ───────────────────────────────────────────────
captureBtn.addEventListener('click', () => {
  showPrivacyWarning(() => {
    captureBtn.textContent = '📷 Capturing…';
    captureBtn.disabled = true;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) {
      captureBtn.textContent = '📷 Capture screen';
      captureBtn.disabled = false;
      return;
    }
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: () => ({ width: window.innerWidth, height: window.innerHeight })
    }, (results) => {
      if (results && results[0]) {
        screenshotViewport = results[0].result;
      }

      chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' }, (response) => {
        captureBtn.textContent = '📷 Capture screen';
        captureBtn.disabled = false;

        if (response && response.screenshot) {
          screenshotDataUrl = response.screenshot;
          screenshotThumb.src = screenshotDataUrl;
          screenshotThumb.style.display = 'block';
          screenshotLabel.style.display = 'inline';
          removeScreenBtn.style.display = 'inline';
        } else {
          appendSystemMessage("Couldn't capture screen. Make sure you're on a normal webpage.");
        }
      });
    });
  });
  });
});

removeScreenBtn.addEventListener('click', clearScreenshot);

// ── Capture mode toggle ───────────────────────────────────
captureModeToggle.addEventListener('click', () => {
  captureMode = !captureMode;
  captureModeToggle.style.background = captureMode ? 'var(--accent)' : 'var(--border)';
  captureModeToggle.style.color = captureMode ? '#fff' : 'var(--muted)';
  captureModeToggle.style.borderColor = captureMode ? 'var(--accent)' : 'var(--border)';
  captureModeToggle.textContent = captureMode ? '◉ Capture Mode: ON' : '⊙ Capture Mode: OFF';
});

// Keyboard shortcut for capture: 'c' key (only when capture mode is ON)
document.addEventListener('keydown', (e) => {
  // Only if 'c' is pressed, capture mode is on, and not typing in textarea
  if (e.key === 'c' && captureMode && document.activeElement !== userInput) {
    e.preventDefault();
    captureBtn.click();
  }
});

function clearScreenshot() {
  screenshotDataUrl = null;
  screenshotViewport = null;
  screenshotThumb.style.display = 'none';
  screenshotLabel.style.display = 'none';
  removeScreenBtn.style.display = 'none';
  screenshotThumb.src = '';
}

// ── Send ─────────────────────────────────────────────────────
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
});
sendBtn.addEventListener('click', handleSend);

async function handleSend() {
  const text = userInput.value.trim();
  if (!text || sendBtn.disabled) return;

  userInput.value = '';
  sendBtn.disabled = true;

  appendUserMessage(text, screenshotDataUrl);

  const userContent = [];
  if (screenshotDataUrl) {
    const base64 = screenshotDataUrl.split(',')[1];
    userContent.push({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64 } });
  }
  userContent.push({ type: 'text', text });

  if (screenshotDataUrl) clearScreenshot();
  conversationHistory.push({ role: 'user', content: userContent });

  const typingId = appendTyping();

  try {
    const reply = await callModel(conversationHistory);
    removeTyping(typingId);
    conversationHistory.push({ role: 'assistant', content: reply });
    appendClaudeMessage(reply);

    const markers = parseMarkers(reply);
    console.log('Sherpa: Full response:', reply);
    console.log('Sherpa: Parsed markers:', markers);
    if (markers.length > 0) {
      console.log('Sherpa: Sending', markers.length, 'markers to draw');
      chrome.runtime.sendMessage({
        type: 'DRAW_MARKERS',
        markers,
        viewport: screenshotViewport
      });
    } else {
      console.error('Sherpa: NO MARKERS FOUND in response');
      console.error('Response length:', reply.length);
      console.error('Contains <markers>?', reply.includes('<markers>'));
      const idx = reply.indexOf('<markers>');
      if (idx >= 0) {
        console.log('Found <markers> at index', idx, ':', reply.substring(idx, idx + 200));
      }
    }
  } catch (err) {
    removeTyping(typingId);
    appendSystemMessage(`Error: ${err.message}`);
  }

  sendBtn.disabled = false;
  userInput.focus();
}

// ── System prompt ─────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Sherpa. Help users click the right elements on web pages.

When user shares a screenshot:
1. Give a brief, direct response acknowledging their situation
2. END with a JSON marker block

FORMAT:
Brief explanation here (1-2 sentences max).

\`\`\`json
[
  { "text": "exact visible text", "step": 1, "type": "button", "location": "where it is" }
]
\`\`\`

RULES FOR JSON:
- text: exact visible text (button label, link text, placeholder). For icons: "X icon", "gear icon", "close button"
- type: button | link | tab | input | icon | menu | radio | checkbox
- location: brief context (section name, position, what section)
- step: sequential number (1, 2, 3...)
- Always include JSON markers at the end, even for follow-ups

EXAMPLE (user clicked wrong element):
"That opened the wrong thing. Here's how to close it:"

\`\`\`json
[
  { "text": "X", "step": 1, "type": "icon", "location": "top right corner of modal" }
]
\`\`\`

EXAMPLE (user asking for next step):
"Good, now select your option from the list:"

\`\`\`json
[
  { "text": "GitHub Actions", "step": 1, "type": "button", "location": "left section" }
]
\`\`\`

For each response with a screenshot, acknowledge what you see + provide markers.`;

// ── API routing ───────────────────────────────────────────────
async function callModel(history) {
  const provider = MODELS[selectedModelId].provider;
  const key = apiKeys[provider];
  if (!key) throw new Error(`No API key for ${provider}. Click the model selector to add one.`);

  if (provider === 'anthropic') return callAnthropic(history, key);
  if (provider === 'openai')    return callOpenAI(history, key);
  if (provider === 'google')    return callGoogle(history, key);
  throw new Error('Unknown provider');
}

async function callAnthropic(history, key) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: selectedModelId,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: history,
    }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || `API error ${res.status}`); }
  const data = await res.json();
  return data.content.map(b => b.text || '').join('');
}

async function callOpenAI(history, key) {
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];
  for (const msg of history) {
    if (msg.role === 'user') {
      const content = msg.content.map(block => {
        if (block.type === 'image') {
          return { type: 'image_url', image_url: { url: `data:${block.source.media_type};base64,${block.source.data}` } };
        }
        return { type: 'text', text: block.text };
      });
      messages.push({ role: 'user', content });
    } else {
      messages.push({ role: 'assistant', content: msg.content });
    }
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ model: selectedModelId, max_tokens: 1024, messages }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || `API error ${res.status}`); }
  const data = await res.json();
  return data.choices[0].message.content || '';
}

async function callGoogle(history, key) {
  const contents = history.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: msg.content.map(block => {
      if (block.type === 'image') {
        return { inlineData: { mimeType: block.source.media_type, data: block.source.data } };
      }
      return { text: block.text };
    }),
  }));

  const modelName = selectedModelId;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
      }),
    }
  );
  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || `API error ${res.status}`); }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
}

// ── Marker parser ─────────────────────────────────────────────
function parseMarkers(text) {
  try {
    // Extract JSON block from ```json ... ``` fence
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (match) {
      const json = match[1].trim();
      const markers = JSON.parse(json);
      if (Array.isArray(markers)) {
        console.log('Parsed markers from code fence:', markers);
        return markers;
      }
    }

    // Fallback: try to parse entire response as JSON (if no code fence)
    const trimmed = text.trim();
    if (trimmed.startsWith('[')) {
      const markers = JSON.parse(trimmed);
      if (Array.isArray(markers)) {
        console.log('Parsed markers (direct JSON):', markers);
        return markers;
      }
    }
  } catch (e) {
    console.error('Parse error:', e.message);
  }
  console.warn('No valid markers found in response');
  return [];
}

// ── Markdown renderer ─────────────────────────────────────────
function renderMarkdown(text) {
  // Remove JSON marker block from display (keep only the explanation text)
  let stripped = text.replace(/```json[\s\S]*?```/g, '').trim();
  stripped = stripped.replace(/\[[\s\S]*?\]/g, (match) => {
    // Only remove if it looks like a JSON array of markers
    if (match.includes('"text"') && match.includes('"step"')) return '';
    return match;
  }).trim();
  return stripped
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/^### (.*?)$/gm, '<h4>$1</h4>')
    .replace(/^## (.*?)$/gm, '<h3>$1</h3>')
    .replace(/^# (.*?)$/gm, '<h3>$1</h3>')
    .replace(/^(\d+)\. (.*?)$/gm, '<div class="md-list-item"><span class="num">$1.</span> <span>$2</span></div>')
    .replace(/^- (.*?)$/gm, '<div class="md-list-item"><span class="num">•</span> <span>$1</span></div>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n(?!<)/g, '<br>');
}

// ── Chat UI helpers ───────────────────────────────────────────
function appendUserMessage(text, screenshot) {
  const msg = document.createElement('div');
  msg.className = 'msg user';

  const label = document.createElement('div');
  label.className = 'msg-label';
  label.textContent = 'You';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  if (screenshot) {
    const img = document.createElement('img');
    img.src = screenshot;
    img.className = 'msg-screenshot';
    bubble.appendChild(img);
    bubble.appendChild(document.createElement('br'));
  }
  bubble.appendChild(document.createTextNode(text));
  msg.appendChild(label);
  msg.appendChild(bubble);
  messagesEl.appendChild(msg);
  scrollToBottom();
}

function appendClaudeMessage(text) {
  const msg = document.createElement('div');
  msg.className = 'msg claude';

  const label = document.createElement('div');
  label.className = 'msg-label';
  label.textContent = 'Sherpa';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.innerHTML = renderMarkdown(text);

  msg.appendChild(label);
  msg.appendChild(bubble);
  messagesEl.appendChild(msg);
  scrollToBottom();
}

function appendSystemMessage(text) {
  const msg = document.createElement('div');
  msg.className = 'msg claude';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.style.borderColor = 'transparent';
  bubble.style.color = 'var(--muted)';
  bubble.style.fontStyle = 'italic';
  bubble.textContent = text;

  msg.appendChild(bubble);
  messagesEl.appendChild(msg);
  scrollToBottom();
}

function appendTyping() {
  const id = 'typing-' + Date.now();
  const msg = document.createElement('div');
  msg.className = 'msg claude';
  msg.id = id;

  const label = document.createElement('div');
  label.className = 'msg-label';
  label.textContent = 'Sherpa';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  const dots = document.createElement('div');
  dots.className = 'typing-dots';
  dots.innerHTML = '<span></span><span></span><span></span>';

  bubble.appendChild(dots);
  msg.appendChild(label);
  msg.appendChild(bubble);
  messagesEl.appendChild(msg);
  scrollToBottom();
  return id;
}

function removeTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
