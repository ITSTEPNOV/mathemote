# Manual release checklist

Open the [main demo](../index.html), [About page](../about.html) and [flight computer](../examples/space-navigation.html) from local files. Use a desktop viewport around 1440 px and a phone viewport around 360 px. For every language, switch between Light, Dark and System and reopen the same page. On About, check the heading, examples, and links to both demos. Keep `  −1.00e+1000  ` in A while changing preferences to verify that the original text remains intact. Enter `1,5` and `NaN` to check feedback in the current language.

| Locale | Desktop check | Phone check |
| --- | --- | --- |
| en | Verify the language fallback, then compare 10⁸ and 10⁹. | Read both cards while moving the slider. |
| ru | Verify the approved face and brow names and decimal-dot hint. | Confirm that the window controls wrap without covering the range. |
| es | Switch between Magnitude and Mission. | Read the time, limit and verdict together. |
| fr | Expand playback controls and check keyboard focus in both themes. | Read wrapped navigation labels and the group legend. |
| de | Check long labels and the complete window controls. | Check legibility of wrapped controls and comparison messages. |
| pt-BR | Check the comma in displayed decimal values. | Confirm the exact source in the selectable text. |
| zh-CN | Verify characters in all controls and facial descriptions. | Check that dense headings and the legend stay readable. |
| ja | Verify characters and browser language selection. | Check wrapped descriptions and the exponent row. |
| ar | Check right-to-left layout with the slider and formulas kept left to right. | Check touch and keyboard direction, negative orders, and wrapped labels. |
| hi | Verify Devanagari glyphs, vowel marks and selectable text. | Check typing, wrapped controls, and legible script at 200%. |

## Behaviour to try in any language

- With A at `1e14`, enter `1e15` in A and confirm that both the order and the displayed window change. Press Next window, edit A and B, and confirm that the manual window stays in place. Select Auto window and confirm it follows A.
- Move to slider position 8, enter `NaN`, then focus the slider and press Left or Right. It should step from 8. Home and End select an endpoint.
- Select Standard 1 and temporarily slow playback. Check that the mouth appears before the target brow position. For neutral brows, check the five-second interval at two speeds.
- From the operating system, change appearance with System selected. Check the palette and keyboard focus. Turn on reduced motion and reopen the page.
- With assistive technology available, listen to the selected metric, compare the text fallback with an installed local voice, and check focus and announcements on physical desktop and phone devices.

Automated results and checked renderings are recorded in [verification.md](verification.md). Physical-device, assistive-hardware and native-speaker acceptance remain manual release checks.
