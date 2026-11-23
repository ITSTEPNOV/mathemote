# Project origin and provenance

## Origin of the method

Igor Stepnov identified a problem with intuitively reading very large numbers. His proposal was to leave the exact value available and add a human facial expression that changes with the scale of the number. The name **Stepnov's Method** identifies the methodology. **Mathemote** identifies its software implementation and facial notation.

Igor Stepnov confirmed he is also the author of the Mathemote project. The software citation records that credit. The development record documents Codex assistance with the implementation.

The available task record documents how the method and implementation were refined. It starts with three decimal orders per mouth expression and three brow positions, with separate sequential and simultaneous standards. The implementation then gained a logarithmic slider, a movable window, text and optional local speech. The project record also contains the author-approved Russian and English expression names and the request to prepare open distribution. [Original specification](STEPNOV-METHOD-ORIGINAL-SPECIFICATION.md) · [Version history](../CHANGELOG.md).

The workspace record supports credit for the initial concept and its rules. The creation date remains unrecorded. The first public Mathemote release was published on 2026-11-23, with its contents identified by the release tag and ZIP archive. [Mathemote 1.0.0](https://github.com/ITSTEPNOV/mathemote/releases/tag/v1.0.0).

## Provenance review

- **Source code and tests.** The available conversation records the implementation being written and revised with Codex assistance. A review of the checked-in imports and package metadata found local modules, Node.js built-ins for testing, and browser APIs. The project declares no npm dependencies or package lock. This inspection does not establish the origin of any edits made outside the reviewed record.
- **Facial graphics.** The available development record shows SVG paths drawn directly in source and a later author-directed change to the shape representing pressed lips. The five drawings, three brow positions and zero symbol are embedded in [faces.js](../src/faces.js). The tests compare their output with a recorded hash. That confirms continuity of the drawings, while origin is supported by the development record.
- **Other images and fonts.** The PNGs in `docs/screenshots/` were captured from the local demo during development. The reviewed pages use local assets and system font stacks. The package contains no separately distributed font files or remote image loads. System-rendered material is outside the project’s license grant.
- **Prose and research.** The available record documents project prose created from the author's task descriptions, implementation notes and citations, with Codex assistance. The cited papers are linked for context. No copies of the cited articles were found in the project. The canonical Apache legal text comes from the Apache Software Foundation.
- **License scope.** The package metadata identifies Apache 2.0 for software. The documentation and original artwork have a separate CC BY 4.0 scope, including graphic paths that share a file with Apache-licensed rendering code. No dependency-license conflict was identified in the inspected source tree. [Component scope](LICENSING.md).

## Author checks before publication

1. Confirm the relevant rights holders and any agreement governing release of the code, wording or graphics, including the use of assistance tools. Credit any additional verified human contributors.
2. Verify whether any code, translation, SVG, screenshot material or prose was added outside the recorded workspace history. For any third-party contribution, confirm permission and retain the applicable notices, or replace it.
3. Resolve the blanket copyright attribution that appeared in the local MIT draft. That draft named Igor Stepnov for the whole work, while the available record confirms the separate concept role. Confirm whether an earlier copy was distributed and which notices apply to any such copy. Add substantiated copyright notices to the relevant sources before release.
4. Confirm the release archive, software tag and metadata. Record the first public publication date and any actual DOI from the released records, with the software release and the specification kept distinct. [Publication procedure](release.md).
