# Stepnov's Method 1.0 specification

## Mathematical representation

For finite `x ≠ 0`, set `k = floor(log10(|x|))`. Equivalently, `k` is the unique integer with `10^k ≤ |x| < 10^(k+1)`. Preserve the sign separately. The visual window starts at order `s` and covers `s…s+14`:

```text
s = 15 × floor(k / 15)   (automatic window)
p = k − s
g = floor(p / 3)
b = p mod 3
k = s + 3g + b
```

This gives exactly 15 distinct mouth/eyebrow pairs per window. The start is part of the interpretation. A face alone identifies a local position. For `k = -16`, the automatic window starts at `-30` and `p = 14`. For `k = 1000`, it starts at `990` and `p = 10`. The implementation normalizes the signed BigInt remainder into `0…14` before subtracting it from `k`. Only the local position is converted to a JavaScript Number.

An exact order outside an explicitly selected window is reported without a mouth/brow pair. Zero uses `Z` with no order or scale start. Infinity retains its sign and `∞`. NaN and invalid input have separate statuses. None of these inputs selects an automatic window.

### Shared window in the demonstrator

Both cards share one window. In Auto, the window follows A when A has a known order. If A has no order, the current window stays in place. Previous and Next start Manual mode, shift the start by 15 and set A to the first power of ten in the new window. The selected window stays in place until the user explicitly selects Auto window. When the window changes, a decimal or scientific B that fits the previous window follows it. Its exponent changes by the difference between the window starts, preserving the signed coefficient and local position. Other B inputs retain their original text. Editing B leaves the window in place.

The slider writes `1e{k}` into A using `k = s + p`. After an input without a slider position, arrow keys resume from the last position. Home and End select the corresponding end explicitly. The current mode and the exact endpoints stay visible. A window change is labeled separately. For long exponents, the ticks and legend use marked offsets.

### Computing exact decimal orders

For a decimal coefficient, remove the point conceptually, let `w` be the number of digits to the left of the point, and let `i` be the zero-based location of the first nonzero digit in the joined digits. For exponent `e` (default `0`), compute `k = e + w − i − 1`. Every digit position up to the first nonzero is accounted for, including leading zeroes. An all-zero coefficient is classified before reading the exponent as an integer. The implementation uses digit indexing and BigInt integer arithmetic for the order.

For signed integer powers, if `|base| = 10^a`, the exact order is `a × exponent`. For other integer bases with magnitude greater than one, the kernel may calculate the positive integer power by exact BigInt arithmetic. If its digit count is `d`, a positive exponent gives order `d−1`. A negative exponent gives order `−d`, because powers of integer bases other than powers of ten cannot themselves be powers of ten. Bases of magnitude one and zero are handled separately.

When the estimate `baseDigitCount × |exponent|` is at most 4096, the kernel can count the digits of the exact integer. For larger ordinary integer powers it instead bounds `e × ln(base) / ln(10)` with BigInt fixed-point intervals. Binary normalization reduces the logarithm argument to the interval from 1 to 2. For such an argument `x`, the logarithm series uses `z = (x−1)/(x+1)` with `0 ≤ z ≤ 1/3`. Every fixed-point operation rounds the two bounds outward. The remaining series is bounded by three times the first omitted power of `z` divided by its odd denominator. The order is returned only when both bounds have the same floor. For reciprocals of non-decimal powers, the exact order is the negative of that floor minus one.

This method certifies orders 3010 for `2^10000` and 47712 for `3^100000` without expanding either power. Powers of ten still use the direct exact rule, including order 1000000 for `10^1000000`. Certification is attempted for bases of up to 4096 digits and exponents of up to 256 digits, at up to 64 guard digits. If the interval still crosses an integer boundary, the result is `order_unavailable`, with the original input unchanged.

Towers associate to the right. The rightmost term may be zero. Each base must be at least two. The exponent of the outermost base is evaluated with the same work bound for each intermediate integer. The outermost value uses the direct power-of-ten rule when possible. For example, `10^10^100` has exact decimal order `10^100`, whereas `10^10^10^100` reaches the calculation limit. The original expression is retained in both cases. Available time, memory and BigInt limits depend on the runtime.

## Facial expressions

Five faces cover 15 local positions. The ranges below refer to positions within the current window. The approved names identify physical expressions. The API exposes them in `faces` and `brows`. The UI, text and speech use the same vocabulary in every window.

- **F0 · Positions 0–2 · Smile / Улыбка.** Lift the corners of the lips.
- **F1 · Positions 3–5 · Neutral Mouth / Нейтральный рот.** Rest the closed lips in a level line.
- **F3 · Positions 6–8 · Downturned Mouth / Опущенные уголки губ.** Lower the corners of the lips.
- **F2 · Positions 9–11 · Pressed Lips / Стиснутые губы.** Bring the teeth together and draw both lips inward until the mouth closes in a thin line. Keep the teeth covered.
- **F4 · Positions 12–14 · Bared Teeth / Оскал.** Pull the lips apart and show the teeth with the jaw only slightly open.
- **Z · Zero.** Round the open mouth as in `:O`, with the eyebrows at rest.

The monochrome SVG uses a shared circular outline, two fixed eyes, mouth paths and brow paths. The legend shows mouths and brows separately. Teeth divisions make F4 distinguishable from a simple opening. The emoticon notation for zero is a textual mnemonic.

- **B0 · Furrowed Brows / Нахмуренные брови.** Draw the eyebrows downward and inward.
- **B1 · Neutral Brows / Нейтральные брови.** Keep the eyebrows relaxed.
- **B2 · Raised Brows / Высоко поднятые брови.** Lift both eyebrows high.

## Transmission standards

**Standard 1 · Sequential.** Establish the mouth shape with eyebrows at rest. Show the brow position, then complete the transmission. For B1, keep the brows still for five seconds from the point at which the mouth shape is established. The animated preview reveals the target brows in the brow phase and repeats the transmission after a short display of the completed state. Demo speed scales the active phases and the time between transmissions, with five seconds for B1 at any speed. A backgrounded browser can deliver the timer callback later than its five-second target.

**Standard 2 · Simultaneous.** Show the mouth and brow position together. The library uses this standard by default, and it can be performed live when comfortable. When animation is enabled, the mouth and active brows relax together and return to the selected expression. Neutral brows stay at rest. The face remains visible throughout the loop. One cycle lasts two seconds at 1×. With animation off, the selected expression stays static.

The main demo opens in Standard 1 at 0.5×. If animation is enabled, playback starts on load. Desktop layouts show the speed control directly, and narrow layouts keep it in the playback disclosure.

Mode can be announced first as digit 1 or 2, with a voice, finger count, matching count of eyebrow lifts, or a digital selection. In live delivery a horizontal head shake may mark a negative sign before the facial code. Both standards carry the same sign and position. The digital demo displays the shared start separately. Live transmission with a movable window requires the participants to know the same start; a facial protocol for communicating the start is outside this version.

## Input and API

Use `require("./src/core.js")` in Node or load `src/core.js` as a classic script and use `globalThis.StepnovMethod` in the browser.

- `classify(input, standard = 2, windowStart = null)` accepts a string or a BigInt and returns a frozen result. A null window start selects the automatic window. An explicit start accepts an integer string or BigInt. Passing another start type throws `TypeError`. Passing a standard other than numeric `1` or `2` throws `RangeError`. Other input types return an `invalid` result with reason `input_type`.
- `describe(result, language = "en")` returns text with sign, expression, eyebrows, known order and applicable status details. Use `"ru"` for Russian.
- `serialize(result)` returns JSON with deterministic field order for a direct classification result. Use `JSON.parse` to read it. A decimal string represents the order in both modes, including orders outside JavaScript's safe integer range.
- `scale`, `faces` and `brows` expose frozen metadata. The `faces` array follows the scale order. `face_index` is the zero-based group index, while `face_id` identifies the expression.

In string input, surrounding whitespace is ignored for parsing and U+2212 is accepted wherever the ASCII minus can appear. All other digits and operators in the following grammar are ASCII. The original string is returned exactly as supplied. BigInt input preserves the numeric value with its base-10 string representation.

- Decimal or scientific notation uses optional sign, digits around an optional decimal point with at least one digit, and optional `e` or `E` followed by a signed integer. Examples include `001.2`, `.01`, `1.`, and `−1.2e+300`.
- A simple power uses an integer base and a signed integer exponent with `^`. An optional unary sign applies to the result, as in `-2^2 = -(2^2)`. Use `(-2)^2` for a negative base. Whitespace is accepted around the caret and after an external unary sign. `0^0` and negative powers of zero produce `undefined_power`. A bare negative sign on zero is retained.
- A tower uses at least two carets, unsigned integer terms and an optional unary sign on the whole expression, as in `-10^2^3`. Every term except the final exponent is at least two. The final term is a nonnegative integer. This syntax covers right-associated towers without parentheses.
- Special values accept `NaN`, `Infinity` and `∞` (case-insensitive for letters), with optional sign for infinity.
- Decimal commas, grouped digit separators, fractional exponents and arbitrary mathematical expressions are outside the grammar.

```json
{
  "original": "9.99e8",
  "input_type": "string",
  "input_kind": "scientific",
  "status": "finite",
  "sign": "positive",
  "magnitude_order": "8",
  "scale_start": "0",
  "scale_position": 8,
  "face_index": 2,
  "brow_index": 2,
  "face_id": "F3",
  "brow_id": "B2",
  "standard": 2,
  "reason": null
}
```

`status` is one of `finite` (visually encoded), `out_of_window`, `order_unavailable`, `zero`, `infinity`, `nan`, or `invalid`. `input_kind` is `decimal`, `scientific`, `power`, `tower`, `special`, or null. The `sign` can be `positive`, `negative`, `zero`, or null. `scale_start` and `magnitude_order` are exact decimal strings when available. `scale_position` is an integer from 0 to 14 for an encoded value, otherwise null. Face and brow fields are null when no symbol is available, except `face_id: "Z"` for zero. `reason` distinguishes `outside_window`, `calculation_limit`, `empty`, `syntax`, `input_type`, `undefined_power`, and `unsupported_tower`.

With `out_of_window`, the exact order is already available. Classify again with a window that includes it, or omit the window start to select one automatically. With `order_unavailable`, the classifier reached its calculation limit. The original input remains available in both cases. With `invalid`, check `reason` for the input problem.

## Presentation channels

The demonstrator uses the same frozen classification result for the SVG, on-screen readout, speech and selectable plain text. The text includes the exact input, sign, order, window start, local position and verbal face/brow description when applicable. Read aloud always queues the full text field in short utterances. Speech uses a browser voice marked `localService` and matching the locale or its base language. Within each match, the demo prefers installed female voices it recognizes by name. If voices are still loading, the first click waits briefly for the list and starts playback when a matching voice appears. Stop cancels both queued speech and a pending start. When no matching voice is available or playback fails, the selectable text remains usable. [Web Speech API specification](https://webaudio.github.io/web-speech-api/#speechsynthesisvoice).

Native controls provide labels and visible focus. The slider exposes the exact absolute order as its accessible value. Committing a change announces the result. In animated Sequential mode, the live region announces the mouth at commit and the target brows at the end of the first reveal. Later cycles update the SVG and phase text silently. Reduced-motion preferences default animation to off. The static Sequential display labels the two phases and the five-second neutral interval.

The read-only text box is intended for selection, copying or reading through the browser and assistive software. A refreshable Braille display can use the screen reader's ordinary text output and, where available, its existing mathematical reading support. This demo defines no Braille symbols, drives no hardware, and its output has not been tested on a physical Braille display.

### Live alternatives

Agree on the window start and the standard first. A sender can announce the standard by speaking its number, showing the number on fingers or lifting the eyebrows that many times before the value. People who cannot comfortably perform a movement can speak or show the order and start in writing, point to the printed face and brow options, or use an assistive communication device. A version of the expression with reduced movement can be agreed within a group, with the order and window stated explicitly as needed. These are communication alternatives. Human readability and cross-cultural interpretation require testing with users.

## Space navigation demonstration

Open [examples/space-navigation.html](../examples/space-navigation.html) directly. The Moon, Mars and Proxima Centauri entries use fixed demonstration distances. They are illustrative inputs and do not describe a dated trajectory. The ship travels at a chosen constant speed in kilometres per second. Travel time in seconds is distance in kilometres divided by speed. Acceleration, braking, orbital manoeuvres and relativistic effects are outside the model. Energy and fuel would require additional physical assumptions and are outside the example.

- **Magnitude** shows distance, speed and travel time. Each metric displays its units and its own automatically selected window. The faces follow Standard 2 in a static presentation. Equal inputs in the same units and window yield the same code.
- **Mission** is a separate experiment. Its face depicts the dimensionless ratio `travel time / time limit`. The screen shows the current travel time, the limit, and whether the former is shorter, equal or longer. The verdict compares the exact distance to `speed × time limit`. The expression itself encodes the magnitude of the ratio.

The available speeds and limits are powers of ten. With the integer demo distances, time and ratio can therefore be expressed in exact terminating decimals. The example shifts the decimal point and passes the resulting strings to the existing classifier. This makes the calculation reproducible and avoids rounding around order boundaries. For example, 384,400 km at 10 km/s takes 38,440 s. With a limit of 100,000 s the ratio is 0.3844.

## Interface integration

Use `src/core.js` alone for decimal classification in JavaScript or Node.js. Keep `magnitude_order` and `scale_start` as strings or convert them to BigInt. Map `face_id` and `brow_id` to the existing SVG paths. Use `StepnovLocales.translate(locale, key, values)`, with the face and brow IDs as keys, or `StepnovChannels.text(result, detailed, locale)` for a complete localized description. Load `locales.js` before the channels and preference scripts in browser integrations.

The two pages share the local dictionary. Default language selection matches the browser’s preferred languages and falls back to English. Theme selection starts in System and tracks the operating system. Explicit preferences use local storage when available. Local navigation also carries preferences as URL parameters. Browsers may restrict persistence for `file:` pages. Use a current browser with BigInt, native range inputs and CSS `light-dark()`.

