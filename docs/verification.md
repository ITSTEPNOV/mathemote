# Verification report · 1.0.0

## Automated library checks

**18 passed, 0 failed** with Node.js 24.18.0. Run `npm test` to reproduce.

- 438 generated checks immediately below, at and above powers of ten across orders −32 through 40, with positive and negative input.
- All local transitions and window rollovers, including negative orders, and fixed-window classification without modifying the original input.
- Leading and trailing zeroes, a very small fixed-point decimal, scientific notation with a 121-digit exponent, a 100,000-digit decimal integer and 10,001-digit BigInt.
- 2,142 generated base/exponent pairs checked against exact integer threshold comparisons, with reciprocal and sign checks for each pair.
- Symbolic powers and right-associated towers, explicit calculation limits, zero, signed infinity, NaN, invalid input and undefined powers.
- SHA-256 snapshot of all 15 face/brow combinations and the zero SVG, matching the original drawings.
- Text fidelity, local-only voice selection with emulated voices, and exact travel time and Mission ratio in all 36 combinations of destination, speed and limit.
- The author-approved bilingual names for all 15 face/brow combinations, in both standards and across three different windows. The text and both speech lengths use the same Russian names.
- Complete entries and matching placeholders in all ten locales. Fast power-order certification checked against exact integer results, including values close to decade boundaries and a case that exceeds the precision budget.
- Byte-for-byte repeated serialization, round trips, identical payloads across standards except for the standard field, and loading the kernel without a DOM.

## Browser checks

**519 checks passed** in Microsoft Edge 158.0.4370.33. Run `./test/slider-browser.ps1` in PowerShell 7 on Windows to reproduce. The checks cover all 15 steps, positive and negative offsets, explicit Auto and Manual modes, exact input and window navigation, keyboard events and focus, both standards and reduced motion. A huge negative exponent stays exact during navigation and slider movement. All three pages load through `file:` and resource URLs are checked for local-only loading. The main demo starts with Sequential at 0.5×, exposes speed directly on desktop, and uses the disclosure on mobile.

The main demo and flight computer were also tested with all ten languages at a width of 360 CSS pixels in light and dark themes. The tests cover label translations, Arabic RTL, localized errors and Mission verdicts, OS theme matching, focus in both themes and restoration of preferences after a local reload. See the [desktop and phone manual checklist](localization-checklist.md).

The About page adds 120 checks. They cover direct offline loading, ten locales at 320 and 360 CSS pixels, light, dark and system themes, Arabic reading direction, formula direction and face accuracy, keyboard focus and navigation preferences. All three pages are checked for a current-page indicator, compact language codes, full menu labels, visible keyboard focus and 44-pixel minimum control height in the header at 360 CSS pixels. In browsers with customizable native select menus, the checks also cover menu width, option height and contrast in both themes. The mobile menu starts collapsed, opens inline and closes with Escape, restoring focus. Desktop navigation stays visible. The flight computer also checks that the disclosure labels and arrows match in size.

All 34 document and asset references in the three pages were resolved against a GitHub Pages project subpath and checked against the local files. After publication, the three public pages were opened in Edge and the specification and core resources returned HTTP 200. The public release ZIP matched the locally verified archive by SHA-256. [Live site](https://itstepnov.github.io/mathemote/) · [Release](https://github.com/ITSTEPNOV/mathemote/releases/tag/v1.0.0).

The multimedia checks use emulated browser speech services to verify full-text playback on both demos and the text fallback. They cover starting after a late voice list on the first click and canceling before a voice is ready. They verify that scrubbing produces no competing live messages, and that a commit adds the face information without repeating the order already exposed by the slider. Both layouts were checked with 200% CSS zoom. The space checks cover changing destination, speed and time limit, the shared SVG and order, and the separation between Magnitude and Mission.

At 2× playback speed the Sequential non-neutral example reached the eyebrow phase within 500 ms. The neutral example completed at the first check after five seconds and then began a new cycle. The Simultaneous check compares two cycles, tests face visibility and verifies all three playback speeds. Both standards return to a static face when animation is disabled. The slider held its vertical position across all 15 orders in both standards at eight viewport widths. At widths from 320 to 500 CSS pixels, the two faces and the slider fit together within an 844-pixel-high viewport after scrolling.

## Screenshots

- [About the method · Russian · light](screenshots/about-light.png)
- [About the method · Russian · dark](screenshots/about-dark.png)
- [English · light](screenshots/polish-light.png)
- [Simplified Chinese · dark](screenshots/polish-dark.png)
- [Arabic · mobile RTL](screenshots/polish-mobile-ar.png)
- [Hindi · mobile](screenshots/polish-mobile-hi.png)
- [Japanese · mobile](screenshots/polish-mobile-ja.png)
- [German · flight computer](screenshots/polish-space.png)
- [Main demo with text and speech controls](screenshots/multimodal.png)
- [Space navigation · Magnitude](screenshots/space-magnitude.png)
- [Space navigation · Mission](screenshots/space-mission.png)
- [Initial window · 1440 × 1200](screenshots/simultaneous.png) shows orders 0–14.
- [Order 1000 · 1440 × 1200](screenshots/window-1000.png) shows the window 990–1004, with local position 10.
- [Negative orders · 1440 × 1200](screenshots/window-negative.png) shows the window −15 to −1.
- [Sequential · 1440 × 1280](screenshots/sequential.png) shows `1e7` in the neutral wait and `−1e9` in the eyebrow phase.
- [Narrow layout · 500 × 1520](screenshots/narrow.png) shows the compact cards and the window controls.

## Open verification

Audible playback with an installed Russian voice, screen-reader output, a physical Braille display, testing on a physical phone and cross-browser checks remain open. Human readability and the ease of reproducing combinations are research questions for the [volunteer pilot](readability-pilot.md).
