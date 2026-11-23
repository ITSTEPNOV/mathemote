# Release preparation

Mathemote 1.0.0 was published on 2026-11-23 after author approval. Original concept and methodology: Igor Stepnov. The software license is Apache 2.0 and the original documentation and artwork scope is CC BY 4.0. [Release](https://github.com/ITSTEPNOV/mathemote/releases/tag/v1.0.0) · [Live demo](https://itstepnov.github.io/mathemote/) · [Licensing](LICENSING.md) · [Provenance](PROJECT-ORIGIN.md).

## Reproduce the runnable release

1. Keep the paths shown below together in an unpacked folder. The static artifacts in `index.html` and `src/` are the build.
2. Run `npm test` with Node.js 22 or later. The source has no dependency installation step.
3. Open `index.html` directly. Try `1e1000` and `0.01`, move the window and drag the slider, then switch standards. Try `−0`, `∞`, `NaN` and `10^10^100`. Open `about.html` directly as well and follow its links to both demos.

The local candidate passed CFF validation against the [official 1.2.0 schema](https://raw.githubusercontent.com/citation-file-format/citation-file-format/1.2.0/schema.json). The SHA-256 of `LICENSE` matches the [official Apache text](https://www.apache.org/licenses/LICENSE-2.0.txt) and is `cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30`. See the [verification report](verification.md) for application checks.

```text
.nojekyll
index.html
about.html
src/
  about.css
  about.js
  core.js
  channels.js
  locales.js
  preferences.js
  faces.js
  demo.js
  demo.css
test/
  core.test.js
  channels-space.test.js
  slider-browser.ps1
examples/
  space-navigation.html
  space-navigation.css
  space-navigation.js
  space-model.js
docs/
  STEPNOV-METHOD-ORIGINAL-SPECIFICATION.md
  PROJECT-ORIGIN.md
  LICENSING.md
  PRIOR-ART.md
  specification.md
  readability-pilot.md
  readability-audit.html
  verification.md
  localization-checklist.md
  release.md
  screenshots/
    simultaneous.png
    sequential.png
    narrow.png
    window-1000.png
    window-negative.png
    multimodal.png
    space-magnitude.png
    space-mission.png
    polish-light.png
    polish-dark.png
    polish-mobile-ar.png
    polish-mobile-hi.png
    polish-mobile-ja.png
    polish-space.png
    about-light.png
    about-dark.png
README.md
README.ru.md
package.json
AUTHORS.md
LICENSE
NOTICE
CHANGELOG.md
CITATION.cff
.zenodo.json
```

For an approved GitHub Pages publication, use the project root as the publishing source. The empty `.nojekyll` file lets Pages serve the existing HTML, JavaScript, CSS and specification as static files. [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

## 1. First GitHub release after author approval

1. Confirm contribution and licensing notices with the author. Choose the approved repository and review the tracked files for private task records, machine-specific files or material outside the approved scope.
2. Commit the reviewed source and version documentation. Run the Node and browser tests, then check that the selected archive opens directly and includes `LICENSE`, `NOTICE` and the component licensing document.
3. In **Releases**, create a draft targeting the reviewed commit. Use the proposed tag `v1.0.0` and title **Mathemote 1.0.0**. Preview release notes and assets before publishing. [GitHub release instructions](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository#creating-a-release).
4. Once explicitly authorized, publish the checked release. Use its actual public date for the first-publication entry in `NOTICE` and the publication metadata. If the tagged version is already published, document the date in a subsequent metadata commit, without moving the tag or replacing the archived release.

Release body:

> Mathemote 1.0.0 implements Stepnov's Method, with original concept and methodology by Igor Stepnov. Five mouth shapes and three eyebrow positions describe decimal orders in a movable window. The offline demo includes both transmission standards and text and optional local speech.
>
> Open `index.html` from the source archive to try the demo. See the specification for input syntax and the verification report for test results. The volunteer pilot remains open.

The package is marked private to prevent an npm publish. The GitHub source release is a separate distribution channel.

## 2. Archive the software on Zenodo

After approval of the DOI workflow, a manual deposit gives control over the mixed license metadata. In **New upload**, choose the software resource type, upload the reviewed source archive and enter the confirmed software creators, version and actual public release date. Set the Apache 2.0 software license. For a mixed archive, also declare CC BY 4.0 and explain both scopes in the description and `NOTICE`. Preview the record before publishing. Zenodo registers the DOI when the record is published. [Zenodo deposit instructions](https://help.zenodo.org/docs/deposit/create-new-upload/) · [Mixed licenses](https://help.zenodo.org/docs/deposit/describe-records/licenses/) · [DOI registration](https://help.zenodo.org/docs/deposit/describe-records/reserve-doi/).

The alternative GitHub integration uses `.zenodo.json` ahead of `CITATION.cff`. The JSON file contains software metadata and a description of the split scope. If automation is explicitly approved for a later release, check the resulting mixed-license fields and creator entries. [Zenodo GitHub metadata documentation](https://help.zenodo.org/docs/github/describe-software/zenodo-json/).

## 3. Give the original specification its own DOI

After approval, archive the exact [original specification](STEPNOV-METHOD-ORIGINAL-SPECIFICATION.md) from the corresponding version in a separate Zenodo deposit. Use an appropriate publication resource type such as a report, identify **Igor Stepnov** as author of the original methodology, and verify credits for any other editorial contributors. Use the title **Stepnov's Method - Original Specification** and **CC BY 4.0**. Use the actual first public date of that document. Once both records are public, link the specification and the software version using their actual related identifiers. An identifier assigned to one record applies to that object. [Zenodo deposit instructions](https://help.zenodo.org/docs/deposit/create-new-upload/) · [DOI registration](https://help.zenodo.org/docs/deposit/describe-records/reserve-doi/).

## 4. Cite the right record

- For the **method**, cite Igor Stepnov, *Stepnov's Method - Original Specification*. Add its verified publication date and version DOI once available.
- For the **software**, cite Igor Stepnov, *Mathemote - implementation of Stepnov's Method*, version 1.0.0. Add the software version DOI when available.

Maintain `CITATION.cff` using the actual records. The top-level metadata describes the software, and the preferred citation points to the specification. The current files record the GitHub release and omit DOI fields pending archival. For a later Zenodo release, create a new version of the corresponding record and cite that version’s DOI. [CITATION.cff](../CITATION.cff) · [CFF schema guide](https://github.com/citation-file-format/citation-file-format/blob/main/schema-guide.md) · [Zenodo versioning](https://help.zenodo.org/docs/deposit/manage-versions/).
