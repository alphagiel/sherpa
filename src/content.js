// content.js — injected into every webpage
// Handles: floating panel overlay + numbered circle markers

// === Floating Panel ===
let sherpaFloat = null;
let sherpaIsDragging = false;
let sherpaDragStartX = 0, sherpaDragStartY = 0;
let sherpaPanelStartLeft = 0, sherpaPanelStartTop = 0;
let sherpaDragOverlay = null;

function toggleSherpaPanel() {
  if (!sherpaFloat) {
    createSherpaPanel();
  } else {
    sherpaFloat.style.display = sherpaFloat.style.display === 'none' ? 'flex' : 'none';
  }
}

function createSherpaPanel() {
  sherpaFloat = document.createElement('div');
  sherpaFloat.id = 'sherpa-float';
  sherpaFloat.style.cssText = `
    position: fixed !important;
    bottom: 20px !important;
    right: 20px !important;
    width: 380px !important;
    height: 200px !important;
    min-width: 300px !important;
    min-height: 160px !important;
    max-height: 90vh !important;
    max-width: 620px !important;
    resize: both !important;
    overflow: hidden !important;
    display: flex !important;
    flex-direction: column !important;
    border-radius: 12px !important;
    border: 1px solid #2a2a3d !important;
    box-shadow: 0 8px 32px rgba(0,0,0,0.65) !important;
    z-index: 2147483646 !important;
    background: #0d0d14 !important;
  `;

  // Drag handle bar (sits above the iframe)
  const dragBar = document.createElement('div');
  dragBar.style.cssText = `
    height: 26px !important;
    background: #16161f !important;
    border-bottom: 1px solid #2a2a3d !important;
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    padding: 0 10px !important;
    cursor: move !important;
    flex-shrink: 0 !important;
    border-radius: 12px 12px 0 0 !important;
    user-select: none !important;
    box-sizing: border-box !important;
  `;

  const gripLabel = document.createElement('span');
  gripLabel.style.cssText = 'font-size:11px;color:#7070a0;font-family:system-ui,sans-serif;letter-spacing:0.05em;';
  gripLabel.textContent = '⠿ Sherpa';

  const closeBtn = document.createElement('button');
  closeBtn.style.cssText = `
    background: none !important; border: none !important; color: #7070a0 !important;
    cursor: pointer !important; font-size: 18px !important; line-height: 1 !important;
    padding: 0 !important; display: flex !important; align-items: center !important;
    font-family: system-ui, sans-serif !important;
  `;
  closeBtn.textContent = '×';
  closeBtn.title = 'Close Sherpa';
  closeBtn.addEventListener('click', () => { sherpaFloat.style.display = 'none'; });

  dragBar.appendChild(gripLabel);
  dragBar.appendChild(closeBtn);

  // Panel iframe
  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('src/panel.html');
  iframe.style.cssText = `
    width: 100% !important;
    flex: 1 !important;
    border: none !important;
    display: block !important;
    min-height: 0 !important;
  `;

  sherpaFloat.appendChild(dragBar);
  sherpaFloat.appendChild(iframe);
  document.body.appendChild(sherpaFloat);

  // === Drag logic ===
  dragBar.addEventListener('mousedown', (e) => {
    if (e.target === closeBtn) return;
    sherpaIsDragging = true;
    sherpaDragStartX = e.clientX;
    sherpaDragStartY = e.clientY;

    const rect = sherpaFloat.getBoundingClientRect();
    sherpaPanelStartLeft = rect.left;
    sherpaPanelStartTop = rect.top;

    // Switch from bottom/right to top/left so we can drag freely
    sherpaFloat.style.setProperty('bottom', 'auto', 'important');
    sherpaFloat.style.setProperty('right', 'auto', 'important');
    sherpaFloat.style.setProperty('left', rect.left + 'px', 'important');
    sherpaFloat.style.setProperty('top', rect.top + 'px', 'important');

    // Transparent overlay captures mousemove even when over iframe
    sherpaDragOverlay = document.createElement('div');
    sherpaDragOverlay.style.cssText = 'position:fixed;inset:0;z-index:2147483645;cursor:move;';
    document.body.appendChild(sherpaDragOverlay);

    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!sherpaIsDragging) return;
    const newLeft = sherpaPanelStartLeft + (e.clientX - sherpaDragStartX);
    const newTop  = sherpaPanelStartTop  + (e.clientY - sherpaDragStartY);
    sherpaFloat.style.setProperty('left', newLeft + 'px', 'important');
    sherpaFloat.style.setProperty('top',  newTop  + 'px', 'important');
  });

  document.addEventListener('mouseup', () => {
    if (!sherpaIsDragging) return;
    sherpaIsDragging = false;
    if (sherpaDragOverlay) { sherpaDragOverlay.remove(); sherpaDragOverlay = null; }
  });
}

// === Auto-clear markers on SPA navigation ===
(function () {
  let lastUrl = location.href;
  function clearIfNavigated() {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      const el = document.getElementById('sherpa-overlay');
      if (el) el.remove();
    }
  }
  window.addEventListener('popstate', clearIfNavigated);
  window.addEventListener('hashchange', clearIfNavigated);
  // Catch pushState/replaceState (React, Vue, etc.)
  setInterval(clearIfNavigated, 800);
})();

// === Marker drawing ===
let overlayContainer = null;

chrome.runtime.onMessage.addListener((message) => {

  if (message.type === 'TOGGLE_PANEL') {
    toggleSherpaPanel();
  }

  if (message.type === 'DRAW_MARKERS') {
    clearAllMarkers();
    drawMarkers(message.markers);
  }

  if (message.type === 'CLEAR_MARKERS') {
    clearAllMarkers();
  }

});

function clearAllMarkers() {
  if (overlayContainer) {
    overlayContainer.remove();
    overlayContainer = null;
  }
}

function drawMarkers(markers) {
  overlayContainer = document.createElement('div');
  overlayContainer.id = 'sherpa-overlay';
  overlayContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 2147483647;
  `;
  document.body.appendChild(overlayContainer);

  markers.forEach((marker, index) => {
    const num = index + 1;

    const x = marker.x * window.innerWidth;
    const y = marker.y * window.innerHeight;

    const circle = document.createElement('div');
    circle.className = 'sherpa-marker';
    circle.style.cssText = `
      position: fixed;
      left: ${x - 18}px;
      top: ${y - 18}px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #FF4444;
      border: 3px solid #fff;
      box-shadow: 0 0 0 2px #FF4444, 0 4px 12px rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      font-weight: 800;
      animation: sherpaPing 0.6s ease-out;
      pointer-events: none;
    `;
    circle.textContent = num;
    overlayContainer.appendChild(circle);

    const arrowLen = 60;
    const arrowX = x + arrowLen;
    const arrowY = y + arrowLen;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      width: ${arrowLen + 4}px;
      height: ${arrowLen + 4}px;
      overflow: visible;
      pointer-events: none;
      animation: sherpaFadeIn 0.4s ease-out 0.1s both;
    `;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '0'); line.setAttribute('y1', '0');
    line.setAttribute('x2', arrowLen); line.setAttribute('y2', arrowLen);
    line.setAttribute('stroke', '#FF4444');
    line.setAttribute('stroke-width', '2.5');
    line.setAttribute('stroke-dasharray', '5,3');

    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    arrow.setAttribute('points', `${arrowLen},${arrowLen} ${arrowLen - 10},${arrowLen - 4} ${arrowLen - 4},${arrowLen - 10}`);
    arrow.setAttribute('fill', '#FF4444');

    svg.appendChild(line);
    svg.appendChild(arrow);
    overlayContainer.appendChild(svg);

    const label = document.createElement('div');
    label.className = 'sherpa-label';
    label.style.cssText = `
      position: fixed;
      left: ${arrowX + 8}px;
      top: ${arrowY - 4}px;
      max-width: 220px;
      background: #1a1a2e;
      border: 1.5px solid #FF4444;
      border-radius: 8px;
      padding: 8px 12px;
      color: #fff;
      font-family: system-ui, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      box-shadow: 0 4px 20px rgba(0,0,0,0.6);
      animation: sherpaFadeIn 0.4s ease-out 0.15s both;
      pointer-events: none;
    `;
    label.innerHTML = `<strong style="color:#FF6666">Step ${num}:</strong> ${marker.description}`;
    overlayContainer.appendChild(label);
  });
}
