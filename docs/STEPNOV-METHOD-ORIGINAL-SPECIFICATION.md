# Stepnov's Method - Original Specification

**Original concept and methodology:** Igor Stepnov  
**Reference implementation and notation:** Mathemote  
**Status:** Consolidated from the author’s instructions and approvals. Published with Mathemote 1.0.0.

**Document license:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). See the [licensing scope](LICENSING.md).

## 1. Purpose and origin

Stepnov's Method supplements a numeric value with a facial representation of its decimal order. Igor Stepnov proposed it as a way to make large scales easier to recognize at a glance. The documented refinements introduced three eyebrow positions, two modes of transmission, a sliding window of orders and additional ways to read the same result. The project's [origin record](PROJECT-ORIGIN.md) provides the evidence and its limits.

The source value remains available in its original notation. The facial representation describes its order of magnitude. Distinct numbers in the same decade can share a face and eyebrow pair.

## 2. Mathematical rule

For finite nonzero `x`, take the decimal order `k` of `|x|`. It is the unique integer satisfying `10^k ≤ |x| < 10^(k+1)`. Retain the sign separately. An order is represented relative to a window starting at integer order `s`. The window contains 15 positions and ends at order `s+14`, inclusive.

```text
s = 15 × floor(k / 15)     automatic window
p = k − s                 local position
g = floor(p / 3)           mouth index
b = p mod 3               brow index
k = s + 3g + b             decoded order
```

The last three rules apply when `0 ≤ p ≤ 14`. The floor is mathematical rounding toward negative infinity. For example, order `−16` has automatic window start `−30` and position `14`. Order `1000` has start `990` and position `10`.

A chosen offset may be supplied in place of the automatic offset. Classifying the same number with a different offset preserves its exact value and order. If that order lies outside the chosen window, show the out-of-window state. The same face can recur in different windows, so the offset must be available to decode the global order. The digital interface displays the window endpoints.

## 3. Approved mouth and brow vocabulary

The expressions describe physical positions. The ranges are local positions, so these names do not denote fixed magnitudes.

- **F0 · positions 0–2 · Smile / Улыбка.** Raise the corners of the mouth.
- **F1 · positions 3–5 · Neutral Mouth / Нейтральный рот.** Rest the closed lips in a level line.
- **F3 · positions 6–8 · Downturned Mouth / Опущенные уголки губ.** Lower the corners of the mouth.
- **F2 · positions 9–11 · Pressed Lips / Стиснутые губы.** Bring the teeth together and draw the lips inward, covering the teeth.
- **F4 · positions 12–14 · Bared Teeth / Оскал.** Draw the lips apart to show the teeth.

Within each mouth group, the first position uses **B0 · Furrowed Brows / Нахмуренные брови**, with the brows drawn down and inward. The second uses **B1 · Neutral Brows / Нейтральные брови**, with the brows at rest. The third uses **B2 · Raised Brows / Высоко поднятые брови**, with both brows high.

### Reading an example

With window start `s = 0`, Neutral Mouth (`F1`) gives group index 1 and Furrowed Brows (`B0`) give brow index 0. The order is `0 + 3 × 1 + 0 = 3`, so the magnitude is at least 1,000 and less than 10,000. The input `2500` falls within that interval. With window start `s = 15`, the same expression gives order 18.

## 4. Transmission standards

**Standard 1 · Sequential.** Show the mouth shape with the eyebrows at rest, then show the brow position. For B1, absence of brow movement for five seconds represents the neutral position. This is the primary standard for live execution.

**Standard 2 · Simultaneous.** Show the mouth shape and brow position together. This is the standard intended for simultaneous visual display and can also be performed live.

The standard can be announced by saying its number, showing it on fingers or making that number of eyebrow lifts before transmission. Both standards encode the same order within a shared window. The minus sign is explicit in digital use. A horizontal head shake can precede live delivery to mark a negative value. Live participants need to know the offset; the method has no approved additional facial code for transmitting it.

## 5. Special cases and exactness

- **Zero** has the distinct round-mouth face `Z` (`:O`). It has no decimal order.
- **Infinity** uses `∞` with its sign. **NaN** and **invalid input** use separate text states.
- **Exact order unavailable** applies to expressions whose order cannot be established within practical calculation limits. Preserve the supplied expression and report the limitation.
- Special or unclassifiable values do not select a new automatic window. Fractions below one use negative orders when those orders are known.

## 6. Multimodal representation

The face, text and speech read the same semantic result: original value, sign, decimal order, window offset, local position, mouth index, brow index and status. Text and voice can state those fields directly. Mathemote provides labeled controls and selectable text through the browser for assistive software. A connected Braille display can use compatible screen reader software. The method defines no new Braille alphabet. In live use, a person can substitute spoken or written values or point to a face and brow key.

## 7. Boundaries and implementation

Orders one step apart identify neighboring decimal intervals. The exact ratio depends on where the two magnitudes fall within those intervals. The proposition that people will recognize magnitude faster or more accurately with this code remains a hypothesis. The project makes no claim of universal interpretation across cultures or users. [Proposed readability pilot](readability-pilot.md).

Mathemote implements the method with an exact classifier, monochrome SVG, the shared logarithmic slider and text and optional local speech channels. Window controls, preferences and calculation work limits describe the implementation. The more detailed [implementation specification](specification.md) documents these choices.

The flight computer's **Magnitude** example uses the same method for absolute quantities. Its experimental **Mission** mode first computes a ratio to a stated limit and then applies the classifier to that ratio. The choice of a criterion and the assessment of a mission belong to that demonstration, outside the normative method.

## 8. Related research

The [research note](PRIOR-ART.md) compares this representation with Chernoff Faces, Order of Magnitude Markers and work on graphical perception. These publications provide context for the comparison and testing of visual encodings. The author credit here identifies the origin of the recorded project concept.
