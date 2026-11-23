// Rendering code: Apache-2.0. Original SVG artwork: CC-BY-4.0.
// See NOTICE and docs/LICENSING.md for the component scope and attribution.
(function () {
  "use strict";

  const mouths = Object.freeze({
    F0: '<path d="M31 60 Q50 82 69 60"/>',
    F1: '<path d="M36 66 H64"/>',
    F2: '<path d="M35 65 Q42 61 50 64 Q58 61 65 65 Q58 69 50 67 Q42 69 35 65 Z" fill="currentColor" stroke="none"/><path d="M30 60 Q34 65 30 70 M70 60 Q66 65 70 70" stroke-width="2.6"/>',
    F3: '<path d="M31 72 Q50 50 69 72"/>',
    F4: '<rect x="30" y="57" width="40" height="19" rx="5"/><path d="M31 66.5 H69 M43 58 V75 M57 58 V75" stroke-width="2"/>',
    Z: '<ellipse cx="50" cy="67" rx="11" ry="14"/>'
  });

  const eyebrows = Object.freeze({
    B0: '<path d="M29 32 L43 39 M57 39 L71 32"/>',
    B1: '<path d="M29 32 H43 M57 32 H71"/>',
    B2: '<path d="M29 25 Q36 16 43 25 M57 25 Q64 16 71 25"/>'
  });

  globalThis.StepnovFaces = Object.freeze({
    draw(faceId, browId = "B1") {
      return `<svg class="face" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="50" cy="50" r="45"/>
          ${browId === null ? "" : `<g class="face-brows" data-brow="${browId}">${eyebrows[browId]}</g>`}
          <g class="face-mouth">${mouths[faceId]}</g>
        </g>
        <g fill="currentColor"><circle cx="36" cy="46" r="2.9"/><circle cx="64" cy="46" r="2.9"/></g>
      </svg>`;
    },
    drawBrows(browId) {
      return `<svg viewBox="25 15 50 28" aria-hidden="true" focusable="false">
        <g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round">${eyebrows[browId]}</g>
      </svg>`;
    }
  });
})();
