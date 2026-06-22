// content.js — injected into every webpage
// Draws numbered circle markers + arrows on top of the page

// Container for all overlay elements
let overlayContainer = null;

// Listen for messages from the background/panel
chrome.runtime.onMessage.addListener((message) => {

  if (message.type === "DRAW_MARKERS") {
    clearAllMarkers(); // remove old ones first
    drawMarkers(message.markers);
  }

  if (message.type === "CLEAR_MARKERS") {
    clearAllMarkers();
  }

});

// Remove all existing markers from the page
function clearAllMarkers() {
  if (overlayContainer) {
    overlayContainer.remove();
    overlayContainer = null;
  }
}

// Draw each marker from Claude's response
// markers = [{ x: 0.45, y: 0.30, label: "1", description: "Click here" }, ...]
// x and y are 0–1 fractions of the page viewport
function drawMarkers(markers) {
  // Create a full-page transparent container
  overlayContainer = document.createElement("div");
  overlayContainer.id = "sherpa-overlay";
  overlayContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;  /* clicks pass through to the page */
    z-index: 2147483647;   /* always on top */
  `;
  document.body.appendChild(overlayContainer);

  markers.forEach((marker, index) => {
    const num = index + 1;

    // Convert fractional coordinates to pixel positions
    const x = marker.x * window.innerWidth;
    const y = marker.y * window.innerHeight;

    // --- Draw the numbered circle ---
    const circle = document.createElement("div");
    circle.className = "sherpa-marker";
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

    // --- Draw the arrow line from circle to a label box ---
    // Arrow goes diagonally down-right from the circle
    const arrowLen = 60;
    const arrowX = x + arrowLen;
    const arrowY = y + arrowLen;

    // SVG arrow line
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
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

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", "0");
    line.setAttribute("y1", "0");
    line.setAttribute("x2", arrowLen);
    line.setAttribute("y2", arrowLen);
    line.setAttribute("stroke", "#FF4444");
    line.setAttribute("stroke-width", "2.5");
    line.setAttribute("stroke-dasharray", "5,3");

    // Arrowhead triangle at the end
    const arrow = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    arrow.setAttribute("points", `
      ${arrowLen},${arrowLen}
      ${arrowLen - 10},${arrowLen - 4}
      ${arrowLen - 4},${arrowLen - 10}
    `);
    arrow.setAttribute("fill", "#FF4444");

    svg.appendChild(line);
    svg.appendChild(arrow);
    overlayContainer.appendChild(svg);

    // --- Label box showing the step description ---
    const label = document.createElement("div");
    label.className = "sherpa-label";
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

    // Bold step number inside label
    label.innerHTML = `<strong style="color:#FF6666">Step ${num}:</strong> ${marker.description}`;
    overlayContainer.appendChild(label);
  });
}
