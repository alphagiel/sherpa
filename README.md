# Sherpa — AI-Powered Web Navigation

Use any AI model to guide you on any webpage — describe what you're looking for, and get visual markers pointing to exactly where to click.

## Demo

Watch how Sherpa works in action:

[![Sherpa Demo](https://img.shields.io/badge/Watch%20Demo-Video-blue)](demo.mov)

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

Sherpa runs on a three-part model: **capture → send → mark**

### File Structure

```
sherpa/
├── manifest.json              # Extension config & permissions
├── src/
│   ├── background.js          # Service worker (messaging hub)
│   ├── content.js             # Page injector (draws markers)
│   ├── panel.html             # Side panel UI
│   ├── panel.js               # Panel logic & API routing
│   └── overlay.css            # Marker styling
└── icons/                     # Extension icons
```

### How It Works

1. **Capture** (`content.js` → `background.js`)
   - User clicks "Capture" or presses `C`
   - Content script screenshots the page and sends to background
   - Background stores screenshot in memory

2. **Send** (`panel.js` → AI Provider)
   - User types question in side panel
   - Panel.js sends screenshot + prompt to chosen API (Claude, GPT-4o, Gemini)
   - API response returns element descriptions or coordinates

3. **Mark** (`background.js` → `content.js`)
   - Background processes AI response and calculates marker positions
   - Content script draws red circles on the actual page overlays
   - User sees exactly where to click

### Message Flow

```
content.js (page) 
   ↓ (screenshot captured)
background.js (service worker)
   ↓ (stores state)
panel.js (side panel)
   ↓ (user question + API key)
AI Provider API
   ↓ (marked coordinates)
background.js
   ↓ (inject positions)
content.js (draws markers)
```

### Adding a New Feature

Want to extend Sherpa? Here's the typical flow:

1. **In `panel.html`** — Add UI button/input
2. **In `panel.js`** — Handle the user interaction
3. **Send message to background** — `chrome.runtime.sendMessage({action: 'yourAction', data: ...})`
4. **In `background.js`** — Add a listener for your action
5. **In `content.js`** — If you need to modify the page, add logic there

#### Example: Add a "Copy Marker Coordinates" Button

**panel.html:**
```html
<button id="copyCoords">Copy Coordinates</button>
```

**panel.js:**
```javascript
document.getElementById('copyCoords').addEventListener('click', () => {
  chrome.runtime.sendMessage({action: 'copyCoords'}, (response) => {
    // handle response
  });
});
```

**background.js:**
```javascript
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === 'copyCoords') {
    // Logic to copy current marker coords
    sendResponse({success: true});
  }
});
```

### Common Tasks

- **Add a new API provider** — Extend `panel.js` routing, add new fetch call
- **Change marker style** — Edit `overlay.css`
- **Modify capture behavior** — Edit `content.js` screenshot logic
- **Add keyboard shortcut** — Add to `manifest.json` commands section

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

We welcome feature improvements, bug fixes, and new AI providers. Here's how to contribute:

### Before You Start

- **Check existing issues** — Don't duplicate work
- **Small features are easier** — Start with marker styling, UI tweaks, or new keyboard shortcuts
- **Ask in issues first** — For big changes, open an issue to discuss approach

### Feature Checklist

Adding a new feature? Make sure to:

- [ ] Update `manifest.json` if adding new permissions
- [ ] Add UI in `panel.html` (if user-facing)
- [ ] Add logic in appropriate file (`panel.js` for UI, `content.js` for page interaction, `background.js` for state)
- [ ] Test with multiple AI providers if your feature uses API calls
- [ ] Update README if adding a new feature or changing behavior
- [ ] Keep code simple — no external dependencies if avoidable

### Testing Your Changes

1. Make your changes
2. Go to `chrome://extensions`
3. Click the reload icon on Sherpa
4. Test on a real website

### PR Tips

- One feature per PR
- Descriptive commit messages ("Add dark mode for markers" not "fix stuff")
- Test before submitting

Questions? Open an issue!

## License

MIT — Use freely, modify, distribute, but keep the license notice.

## Made with

- [Claude API](https://anthropic.com) — AI backbone
- Chrome Extensions API — Power and persistence
- Pure JavaScript — No build step needed

---

**Pro tip:** Use Sherpa to guide you through unfamiliar websites, teach someone else step-by-step, or navigate complex UIs without hunting around. It learns what your screen looks like, so it can point you exactly where you need to go.
