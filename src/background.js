// Toggle the floating panel in the active tab
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PANEL' });
  } catch (err) {
    // Content script not yet running on this tab (e.g. tab existed before install)
    // Inject it dynamically, then open the panel
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['src/content.js'] });
      await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['src/overlay.css'] });
      await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PANEL' });
    } catch (e) {
      console.error('Sherpa: cannot inject on this page:', e.message);
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.type === 'CAPTURE_SCREENSHOT') {
    (async () => {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tabId = tabs[0]?.id;
      if (!tabId) { sendResponse({ error: 'No active tab' }); return; }

      // Hide the floating panel so it doesn't appear in the screenshot
      await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const p = document.getElementById('sherpa-float');
          if (p) p.style.visibility = 'hidden';
        }
      }).catch(() => {});

      // One frame for repaint
      await new Promise(r => setTimeout(r, 80));

      chrome.tabs.captureVisibleTab(null, { format: 'png', quality: 90 }, async (dataUrl) => {
        // Restore panel visibility
        await chrome.scripting.executeScript({
          target: { tabId },
          func: () => {
            const p = document.getElementById('sherpa-float');
            if (p) p.style.visibility = 'visible';
          }
        }).catch(() => {});

        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ screenshot: dataUrl });
        }
      });
    })().catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (message.type === 'TOGGLE_MARKERS_VISIBILITY') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (visible) => {
          const el = document.getElementById('sherpa-overlay');
          if (el) el.style.visibility = visible ? 'visible' : 'hidden';
        },
        args: [message.visible]
      });
    });
    return true;
  }

  if (message.type === 'DRAW_MARKERS') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: sherpaDrawMarkers,
        args: [message.markers]
      });
    });
    return true;
  }

  if (message.type === 'CLEAR_MARKERS') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => { const el = document.getElementById('sherpa-overlay'); if (el) el.remove(); }
      });
    });
    return true;
  }

});

function sherpaDrawMarkers(markers) {
  try {
    console.log('sherpaDrawMarkers: starting with', markers.length, 'markers');

    function findElement(description) {
      const { text, type, location } = description;
      console.log('Searching for:', text, 'type:', type);

      const allElements = document.querySelectorAll('button, a, input, [role="button"], [role="tab"], [role="link"], [role="menuitem"]');

      for (const el of allElements) {
        if (el.offsetParent === null) continue;

        const elText = el.textContent.trim() || el.placeholder || el.getAttribute('aria-label') || el.title;
        if (elText && elText.toLowerCase().includes(text.toLowerCase())) {
          const rect = el.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          console.log('Found element:', elText, 'at', Math.round(cx), Math.round(cy));
          return { cx, cy, el, rect };
        }
      }

      console.log('No element found for:', text);
      return null;
    }

    if (!document.getElementById('sherpa-styles')) {
      const s = document.createElement('style');
      s.id = 'sherpa-styles';
      s.textContent = `
        @keyframes sherpaPing { 0% { transform:scale(0.9); box-shadow:0 0 0 0 rgba(255,68,68,.8),0 4px 12px rgba(0,0,0,.5); } 50% { transform:scale(1.1); box-shadow:0 0 0 6px rgba(255,68,68,.3),0 4px 12px rgba(0,0,0,.5); } 100% { transform:scale(0.9); box-shadow:0 0 0 0 rgba(255,68,68,.8),0 4px 12px rgba(0,0,0,.5); } }
        @keyframes sherpaFadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
      `;
      document.head.appendChild(s);
    }

    const old = document.getElementById('sherpa-overlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'sherpa-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:999999999;';
    document.body.appendChild(overlay);

    markers.forEach((marker) => {
      try {
        const num = marker.step;

        const found = findElement(marker);
        if (!found) {
          console.warn('Could not find element for marker', num);
          return;
        }

        const { cx, cy } = found;
        const x = Math.round(cx);
        const y = Math.round(cy);

        console.log('Drawing marker', num, 'at', x, y);

        // Group wrapper so click can toggle the whole marker
        const group = document.createElement('div');
        group.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;pointer-events:none;';
        overlay.appendChild(group);

        // Circle — clickable to toggle arrow + label visibility
        const circle = document.createElement('div');
        circle.style.cssText = `position:fixed;left:${x - 16}px;top:${y - 16}px;width:32px;height:32px;border-radius:50%;background:#FF4444;border:3px solid #fff;box-shadow:0 0 0 2px #FF4444,0 4px 12px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;color:#fff;font-family:system-ui,sans-serif;font-size:13px;font-weight:800;animation:sherpaPing 1.4s ease-in-out infinite;pointer-events:auto;cursor:pointer;transition:opacity 0.2s;`;
        circle.textContent = num;
        circle.title = 'Click to hide';

        const AL = 60;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${AL + 4}px;height:${AL + 4}px;overflow:visible;pointer-events:none;animation:sherpaFadeIn .4s ease-out .1s both;`;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', '0'); line.setAttribute('y1', '0');
        line.setAttribute('x2', AL); line.setAttribute('y2', AL);
        line.setAttribute('stroke', '#FF4444');
        line.setAttribute('stroke-width', '2.5');
        line.setAttribute('stroke-dasharray', '5,3');

        const arrowhead = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        arrowhead.setAttribute('points', `${AL},${AL} ${AL - 10},${AL - 4} ${AL - 4},${AL - 10}`);
        arrowhead.setAttribute('fill', '#FF4444');

        svg.appendChild(line);
        svg.appendChild(arrowhead);

        const lbl = document.createElement('div');
        lbl.style.cssText = `position:fixed;left:${x + AL + 8}px;top:${y + AL - 4}px;max-width:220px;background:#1a1a2e;border:1.5px solid #FF4444;border-radius:8px;padding:8px 12px;color:#fff;font-family:system-ui,sans-serif;font-size:12px;line-height:1.5;box-shadow:0 4px 20px rgba(0,0,0,.6);animation:sherpaFadeIn .4s ease-out .15s both;pointer-events:none;`;
        lbl.innerHTML = `<strong style="color:#FF6666">Step ${num}:</strong> ${marker.text}`;

        group.appendChild(circle);
        group.appendChild(svg);
        group.appendChild(lbl);

        // Toggle arrow + label on click; dim circle to signal hidden state
        circle.addEventListener('click', function () {
          const isHidden = group.dataset.hidden === '1';
          if (isHidden) {
            svg.style.visibility = 'visible';
            lbl.style.visibility = 'visible';
            circle.style.opacity = '1';
            circle.title = 'Click to hide';
            group.dataset.hidden = '0';
          } else {
            svg.style.visibility = 'hidden';
            lbl.style.visibility = 'hidden';
            circle.style.opacity = '0.3';
            circle.title = 'Click to show';
            group.dataset.hidden = '1';
          }
        });
      } catch (err) {
        console.error('Error drawing marker:', err);
      }
    });

    console.log('sherpaDrawMarkers: complete');
  } catch (err) {
    console.error('sherpaDrawMarkers error:', err);
  }
}
