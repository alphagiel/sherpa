# Sherpa — AI-Powered Web Navigation

Ask Claude, GPT-4o, or Gemini where to click on any webpage, and get visual markers pointing to exactly where you need to go.

## Features

✨ **Visual Navigation** — AI analyzes screenshots and draws precise markers on the page showing which elements to click

🔮 **Multi-Model Support** — Use Claude (Anthropic), GPT-4o (OpenAI), or Gemini (Google) — switch anytime

📸 **Smart Capture** — Press `C` key while hovering to capture, perfect for UI elements that reveal on hover

🎯 **Accurate Detection** — DOM-based element detection finds exact positions, not guesses

🔐 **Privacy First** — Warnings before capturing sensitive data, API keys stored locally only

## Installation

### 1. Clone This Repository
```bash
git clone https://github.com/alphagiel/sherpa.git
cd sherpa
```

### 2. Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `sherpa` folder

You should see Sherpa in your extensions list ✅

### 3. Get an API Key

Pick one or more:
- **Claude**: Get key from [console.anthropic.com](https://console.anthropic.com)
- **OpenAI**: Get key from [platform.openai.com](https://platform.openai.com)
- **Google**: Get key from [makersuite.google.com](https://makersuite.google.com)

## How to Use

### Basic Flow

1. **Click the Sherpa icon** → Opens side panel
2. **Paste your API key** → Stores locally (never sent anywhere except to the provider)
3. **Navigate to any webpage**
4. **Capture screen** → Click button or press `C` key
5. **Ask Sherpa** → "Where do I click to find the settings?"
6. **Get visual markers** → Red circles point to the exact elements

### For Hover-Reveal UIs

Some sites show options only when you hover (dropdowns, menus, etc.):

1. **Enable Capture Mode** → Click the toggle button (turns red)
2. **Hover over the element** on the page
3. **Press `C`** — captures the hover state without moving your mouse
4. **Ask Sherpa** → Gets to see the revealed elements
5. **Get markers** → Points to what appeared on hover

### Keyboard Shortcuts

- **`C`** — Capture screenshot (when Capture Mode is ON)
- **`Enter`** — Send message to Sherpa
- **`Shift+Enter`** — New line in message

## ⚠️ Privacy & Security

**Before you screenshot**, remember that everything visible becomes data sent to the AI provider:

❌ **DO NOT screenshot:**
- Passwords, API keys, or secrets
- Personal, medical, or financial data
- Proprietary or confidential information
- Anything regulated (GDPR, HIPAA, PCI-DSS)

✅ **Safe to screenshot:**
- Public websites and UIs
- Generic navigation questions
- Demo or educational content

Sherpa will warn you before capturing. Read it.

## Features by Model

All models support the same core features. Choose based on your needs:

| Model | Speed | Accuracy | Cost | Vision |
|-------|-------|----------|------|--------|
| Claude Haiku | ⚡ Fast | Good | $ | ✓ |
| Claude Sonnet | ⚡⚡ | Excellent | $$ | ✓ |
| Claude Opus | ⚡⚡⚡ | Best | $$$ | ✓ |
| GPT-4o mini | ⚡ Fast | Good | $ | ✓ |
| GPT-4o | ⚡⚡ | Excellent | $$ | ✓ |
| Gemini Flash | ⚡ Fast | Good | $ | ✓ |
| Gemini Pro | ⚡⚡ | Excellent | $$ | ✓ |

## Architecture

- **`manifest.json`** — Chrome extension configuration
- **`src/background.js`** — Service worker; handles messaging and marker injection
- **`src/panel.js`** — Side panel UI and API routing
- **`src/panel.html`** — Panel interface
- **`src/content.js`** — Page overlay for drawing markers
- **`src/overlay.css`** — Marker styles

## Troubleshooting

**Markers don't appear:**
- Make sure the side panel is closed (markers appear on the live page, not in the panel)
- Reload the page after capturing
- Check browser console for errors

**"No markers found" error:**
- Make sure you captured a screenshot before asking
- Claude may not have included markers — try asking more specifically: "Where do I click to..."

**API key errors:**
- Double-check your key is correct (no extra spaces)
- Make sure it's the right provider's key (Claude key won't work with OpenAI)
- Check that your API account has credits

**Extension won't load:**
- Make sure Developer Mode is enabled
- Try reloading the extension on `chrome://extensions`

## Contributing

Found a bug? Want to improve the marker accuracy? Open an issue or submit a PR!

## License

MIT — Use freely, modify, distribute, but keep the license notice.

## Made with

- [Claude API](https://anthropic.com) — AI backbone
- Chrome Extensions API — Power and persistence
- Pure JavaScript — No build step needed

---

**Pro tip:** Use Sherpa to guide you through unfamiliar websites, teach someone else step-by-step, or navigate complex UIs without hunting around. It learns what your screen looks like, so it can point you exactly where you need to go.
