param(
    [string]$EdgePath = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
)

$ErrorActionPreference = 'Stop'
if (!(Test-Path -LiteralPath $EdgePath -PathType Leaf)) {
    throw 'Set -EdgePath to the Microsoft Edge executable.'
}
$root = Split-Path -Parent $PSScriptRoot
$scratch = Join-Path ([System.IO.Path]::GetTempPath()) ('stepnov-slider-' + [guid]::NewGuid())
$null = New-Item -ItemType Directory -Path $scratch

$testScript = @'
<script id="slider-test-script">
const jsErrors = [];
addEventListener("error", event => jsErrors.push(event.message));
addEventListener("unhandledrejection", event => jsErrors.push(String(event.reason)));
addEventListener("load", async () => {
  const checks = [];
  function check(condition, name) {
    if (!condition) throw new Error(name);
    checks.push(name);
  }
  const byId = id => document.getElementById(id);
  const slider = byId("order-slider");
  const input = byId("input-a");
  const reference = byId("input-b")?.value;
  const phase = () => document.querySelector("#panel-a .phase");
  const stage = () => document.querySelector("#panel-a .picture")?.innerHTML;
  const selectedFace = () => [...byId("legend").children].findIndex(item => item.hasAttribute("aria-current"));
  const status = () => byId("order-status").textContent;
  const wait = delay => new Promise(resolve => setTimeout(resolve, delay));
  const nativeEvent = type => new Event(type, { bubbles: true });
  function faceSvg(faceId, browId) {
    const picture = document.createElement("div");
    picture.innerHTML = StepnovFaces.draw(faceId, browId);
    return picture.innerHTML;
  }
  function setA(value) {
    input.value = value;
    input.dispatchEvent(nativeEvent("input"));
  }
  function slide(order, commit = false) {
    slider.value = order;
    slider.dispatchEvent(nativeEvent("input"));
    if (commit) slider.dispatchEvent(nativeEvent("change"));
  }
  function pass() {
    output.textContent = `PASS (${checks.length}): ${checks.join(" | ")}`;
  }
  const output = document.createElement("output");
  output.id = "slider-test-result";
  document.body.append(output);
  try {
    check(location.protocol === "file:", "offline file launch");
    const query = new URLSearchParams(location.search);
    if (query.has("persist")) {
      if (!sessionStorage.getItem("preference-test-ready")) {
        byId("language").value = "ja";
        byId("language").dispatchEvent(nativeEvent("change"));
        byId("theme").value = "dark";
        byId("theme").dispatchEvent(nativeEvent("change"));
        sessionStorage.setItem("preference-test-ready", "yes");
        location.replace(location.pathname + "?persist");
        return;
      }
      check(document.documentElement.lang === "ja" && document.documentElement.dataset.theme === "dark",
        "language and theme restored after a local file reload without URL preferences");
      pass();
      return;
    }
    if (query.has("locales")) {
      const space = query.has("space");
      const about = query.has("about");
      const page = document.documentElement.cloneNode(true);
      page.querySelector("#slider-test-script").remove();
      page.querySelector("#slider-test-result").remove();
      page.querySelector(".nav-toggle").remove();
      const frame = document.createElement("iframe");
      frame.width = 360;
      frame.height = 2200;
      frame.style.border = "0";
      frame.srcdoc = "<!doctype html>" + page.outerHTML;
      await new Promise(resolve => {
        frame.addEventListener("load", resolve, { once: true });
        document.body.append(frame);
      });
      const doc = frame.contentDocument;
      const win = frame.contentWindow;
      const root = doc.documentElement;
      const nav = doc.getElementById("page-nav");
      const menu = doc.querySelector(".nav-toggle");
      check(document.querySelector(".nav-toggle").hidden && !byId("page-nav").hidden, "desktop navigation stays visible");
      const brand = doc.querySelector(".top-inner > span").getBoundingClientRect();
      const settings = doc.getElementById("preferences").getBoundingClientRect();
      const toggle = menu.getBoundingClientRect();
      check(nav.hidden && !menu.hidden && menu.getAttribute("aria-expanded") === "false"
        && brand.top >= toggle.top && brand.bottom <= toggle.bottom
        && settings.top === toggle.top && settings.bottom === toggle.bottom && toggle.width >= 44 && toggle.height >= 44,
        "mobile menu starts collapsed in the same row as the brand and preferences");
      menu.click();
      check(menu.getAttribute("aria-expanded") === "true" && !nav.hidden && nav.getBoundingClientRect().top >= toggle.bottom,
        "mobile menu opens below the header");
      nav.querySelector("a").focus();
      doc.activeElement.dispatchEvent(new win.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      check(nav.hidden && menu.getAttribute("aria-expanded") === "false" && doc.activeElement === menu,
        "Escape closes the mobile menu and restores focus");
      menu.click();
      if (!space && !about) doc.querySelector('input[name="standard"][value="2"]').click();
      const pick = (id, value) => {
        const field = doc.getElementById(id);
        field.value = value;
        field.dispatchEvent(new win.Event("change", { bubbles: true }));
      };
      const enter = value => {
        const field = doc.getElementById("input-a");
        field.value = value;
        field.dispatchEvent(new win.Event("input", { bubbles: true }));
      };
      const color = () => win.getComputedStyle(root).backgroundColor;
      pick("theme", "light");
      const light = color();
      pick("theme", "dark");
      const dark = color();
      pick("theme", "system");
      check(light !== dark && color() === (win.matchMedia("(prefers-color-scheme: dark)").matches ? dark : light),
        "light, dark and system use their expected palettes");
      if (about) doc.getElementById("language").focus();
      for (const locale of Object.keys(StepnovLocales.languages)) {
        pick("language", locale);
        const t = (key, vals) => StepnovLocales.translate(locale, key, vals);
        check(root.lang === locale && root.dir === (locale === "ar" ? "rtl" : "ltr"), `${locale} document language and direction`);
        check([...doc.querySelectorAll("[data-i18n]")].every(node => node.textContent.trim() === t(node.dataset.i18n).trim())
          && [...doc.querySelectorAll("[data-i18n-label]")].every(node => node.getAttribute("aria-label") === t(node.dataset.i18nLabel)),
          `${locale} static labels are translated`);
        const current = nav.querySelectorAll('[aria-current="page"]');
        check(nav.children.length === 3 && nav.querySelectorAll("a").length === 2 && current.length === 1
          && current[0].dataset.i18n === (about ? "about" : space ? "useCase" : "navDemo")
          && [...nav.children, doc.getElementById("language"), doc.getElementById("theme")]
            .every(control => control.getBoundingClientRect().height >= 44),
          `${locale} navigation marks the current page and has finger-sized links and settings`);
        check(doc.getElementById("language-code").textContent === locale.split("-")[0].toUpperCase()
          && doc.getElementById("language").selectedOptions[0].textContent === StepnovLocales.languages[locale]
          && doc.getElementById("theme").selectedOptions[0].textContent === t(root.dataset.theme)
          && doc.querySelectorAll(".preference-control svg[aria-hidden='true']").length === 2,
          `${locale} compact selectors keep the full native menu values`);
        if (about) {
          const examples = [...doc.querySelectorAll(".about-values li")];
          check(examples.map(item => item.querySelector("sup").textContent).join() === "6,9,12"
            && examples.every(item => win.getComputedStyle(item.querySelector("bdi")).direction === "ltr")
            && examples.every((item, index) => item.querySelector(".about-face").innerHTML === faceSvg(["F3", "F2", "F4"][index], "B0")),
            `${locale} static face examples and exponents survive language switching`);
          check(doc.querySelector('a[data-i18n="originalSpec"]').href.endsWith("/docs/STEPNOV-METHOD-ORIGINAL-SPECIFICATION.md")
            && ["index.html", "examples/space-navigation.html"].every(destination => [...doc.querySelectorAll("[data-page-link]")]
              .some(link => new URL(link.href).pathname.endsWith(`/${destination}`) && new URL(link.href).searchParams.get("lang") === locale)),
            `${locale} both demos and the specification remain linked`);
        } else if (space) {
          check(doc.querySelector('[data-metric="travel"] h3').textContent === t("travel")
            && doc.querySelector('[data-metric="travel"] .readout').textContent.includes(t("F1")),
            `${locale} space result uses the localized core vocabulary`);
          doc.querySelector('input[value="mission"]').click();
          check(doc.getElementById("mission-times").textContent.includes(t("within")), `${locale} Mission verdict`);
          doc.querySelector('input[value="magnitude"]').click();
        } else {
          enter("invalid");
          check(doc.querySelector("#panel-a .readout").textContent === t("syntax"), `${locale} error text`);
          enter("  −1.00e+1000  ");
          check(doc.getElementById("input-a").value === "  −1.00e+1000  "
            && doc.querySelector("#panel-a .readout").textContent.includes(t("F2"))
            && doc.querySelector("#panel-a .readout").textContent.includes(t("B1"))
            && doc.querySelector("#window-range bdi").textContent === "10^990 … 10^1004",
            `${locale} preserves exact input and shows the expected order and face`);
        }
        for (const theme of ["light", "dark"]) {
          pick("theme", theme);
          check(root.scrollWidth === root.clientWidth && win.innerWidth === 360, `${locale} ${theme} layout has no horizontal overflow`);
          if (about) {
            frame.width = 320;
            check(root.scrollWidth === root.clientWidth && win.innerWidth === 320, `${locale} ${theme} 320px layout has no horizontal overflow`);
            frame.width = 360;
          }
        }
      }
      if (about) check(doc.activeElement.id === "language", "language switching preserves keyboard focus");
      check(new URL(doc.querySelector("[data-page-link]").href).searchParams.get("lang") === root.lang
        && new URL(doc.querySelector("[data-page-link]").href).searchParams.get("theme") === root.dataset.theme,
        "navigation carries both preferences to the other local page");
      const focusTarget = about ? doc.querySelector("[data-page-link]") : doc.getElementById(space ? "ship-speed" : "order-slider");
      function contrast(left, right) {
        const luminance = value => (value.match(/\d+/g) ?? []).slice(0, 3)
          .map(channel => Number(channel) / 255)
          .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
          .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
        const a = luminance(left);
        const b = luminance(right);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      }
      for (const theme of ["light", "dark"]) {
        pick("theme", theme);
        for (const id of ["language", "theme"]) {
          const control = doc.getElementById(id);
          control.focus();
          check(doc.activeElement === control && win.getComputedStyle(control.closest("label")).outlineStyle === "solid",
            `${theme} ${id} selector shows keyboard focus`);
        }
        if (win.CSS.supports("appearance: base-select") && win.CSS.supports("selector(::picker(select))")) {
          const menuSizes = ["language", "theme"].map(id => {
            const select = doc.getElementById(id);
            return {
              appearance: win.getComputedStyle(select).appearance,
              picker: win.getComputedStyle(select, "::picker(select)"),
              option: win.getComputedStyle(select.selectedOptions[0])
            };
          });
          check(menuSizes.every(({ appearance, picker, option }) => appearance === "base-select"
            && Number.parseFloat(picker.minInlineSize) >= 176 && Number.parseFloat(option.minBlockSize) >= 44
            && picker.backgroundColor !== "rgba(0, 0, 0, 0)" && contrast(picker.color, picker.backgroundColor) >= 4.5),
            `${theme} both preference menus have readable styling and room for full labels`);
        }
        focusTarget.focus();
        check(doc.activeElement === focusTarget && win.getComputedStyle(focusTarget).outlineStyle === "solid",
          `${theme} focus indicator is visible`);
        const readout = doc.querySelector(about ? ".about-examples article p" : ".readout");
        const card = readout.closest(about ? "article" : ".card");
        const focusBackground = about ? win.getComputedStyle(focusTarget.closest(".top")).backgroundColor : color();
        check(contrast(win.getComputedStyle(readout).color, win.getComputedStyle(card).backgroundColor) >= 4.5
          && contrast(win.getComputedStyle(focusTarget).outlineColor, focusBackground) >= 3,
          `${theme} result text and focus indicator meet contrast thresholds`);
      }
      if (about) check(performance.getEntriesByType("resource").every(resource => resource.name.startsWith("file:")), "About loads only local resources");
      check(!jsErrors.length, "locale matrix has no script errors");
      pass();
      return;
    }
    if (query.has("space")) {
      const [textSummary, modelSummary] = [...document.querySelectorAll(".number-access summary, .input-examples summary")];
      check(["fontSize", "fontWeight"].every(property => getComputedStyle(textSummary)[property] === getComputedStyle(modelSummary)[property])
        && getComputedStyle(textSummary, "::marker").fontSize === getComputedStyle(modelSummary, "::marker").fontSize,
        "the speech and model disclosures use matching labels and arrows");
      const metric = id => document.querySelector(`[data-metric="${id}"] .metric-value`).textContent.replace(/\s+/g, " ");
      const metricWindow = id => document.querySelector(`[data-metric="${id}"] .metric-window`).textContent;
      const radio = value => document.querySelector(`input[name="navigation-mode"][value="${value}"]`);
      check(!byId("magnitude").hidden && byId("mission").hidden, "Magnitude is clearly separated from Mission");
      check(metric("travel") === "38 440 с" && metric("distance") === "384 400 км", "initial Moon route uses seconds and kilometres");
      byId("ship-speed").value = "2";
      byId("ship-speed").dispatchEvent(nativeEvent("change"));
      check(metric("travel") === "3 844 с", "changing speed updates travel time");
      byId("destination").value = "mars";
      byId("destination").dispatchEvent(nativeEvent("change"));
      check(metric("travel") === "780 000 с", "changing destination updates travel time");
      const result = StepnovMethod.classify("780000");
      check(metricWindow("travel").includes(`10^${result.scale_start}`)
        && document.querySelector('[data-metric="travel"] .picture').innerHTML === faceSvg(result.face_id, result.brow_id),
        "magnitude card uses the common SVG and window");
      byId("number-access").open = true;
      byId("number-access").dispatchEvent(nativeEvent("toggle"));
      check(byId("voice-item").options.length === 3 && byId("number-text").value.includes("78000000"), "Magnitude text export exposes exact source and units");
      radio("mission").click();
      check(byId("magnitude").hidden && !byId("mission").hidden && metric("ratio") === "7,8"
        && byId("mission-times").textContent.includes("Дольше лимита"), "Mission shows the ratio against the displayed limit");
      check(byId("voice-item").options.length === 1 && byId("number-text").value.includes("Исходная запись: 7.8"),
        "Mission text export uses the ratio classification");
      const missionSpeech = [];
      Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: class { constructor(text) { this.text = text; } } });
      Object.defineProperty(window, "speechSynthesis", { configurable: true, value: {
        getVoices: () => [{ lang: "ru-RU", localService: true }],
        speak: utterance => { missionSpeech.push(utterance.text); }
      } });
      byId("voice-speak").click();
      check(document.querySelectorAll(".channel-controls select").length === 1
        && missionSpeech.join("") === byId("number-text").value && missionSpeech.join("").includes(byId("mission-times").textContent),
        "Mission speech reads the entire text including travel time and time limit");
      byId("mission-limit").value = "7";
      byId("mission-limit").dispatchEvent(nativeEvent("change"));
      check(metric("ratio") === "0,078" && metricWindow("ratio").includes("10^-15")
        && byId("mission-times").textContent.includes("В пределах лимита"), "limit changes the ratio without changing travel time");
      radio("magnitude").click();
      check(metric("travel") === "780 000 с", "the absolute metric is independent of the Mission limit");
      document.body.style.zoom = "2";
      check(document.documentElement.scrollWidth === document.documentElement.clientWidth, "space interface reflows at 200% zoom");
      check(performance.getEntriesByType("resource").every(resource => resource.name.startsWith("file:")) && !jsErrors.length,
        "space assets are local and no script errors");
      pass();
      return;
    }
    const sequential = document.querySelector('input[name="standard"][value="1"]');
    const simultaneous = document.querySelector('input[name="standard"][value="2"]');
    const range = () => byId("window-range").textContent;
    const playbackOptions = byId("speed").closest("details");
    check(sequential.checked && byId("speed").value === "0.5", "first standard and half speed are selected on load");
    check(playbackOptions.open && getComputedStyle(playbackOptions.querySelector("summary")).display === "none",
      "desktop exposes speed without a disclosure");
    if (query.has("reduced")) {
      check(matchMedia("(prefers-reduced-motion: reduce)").matches, "browser reduced motion");
      check(!byId("motion").checked && byId("speed").disabled && phase().textContent.startsWith("1."),
        "Sequential starts static with reduced motion");
      simultaneous.click();
      await wait(1600);
      check(!document.querySelector(".is-looping") && stage() === faceSvg("F3", "B2"), "Simultaneous stays static with reduced motion");
      sequential.click();
      check(!byId("motion").checked, "animation defaults off");
      slide(9, true);
      check(phase().textContent.startsWith("1.") && stage() === faceSvg("F2", "B0"), "static sequence after slider commit");
      check(jsErrors.length === 0, "no script errors");
      pass();
      return;
    }
    check(phase().textContent.startsWith("Шаг 1") && stage() === faceSvg("F3", "B1"), "startup shows the mouth before the brows");
    await wait(1000);
    check(phase().textContent.startsWith("Шаг 1"), "the first phase lasts longer at half speed");
    await wait(850);
    check(phase().textContent.startsWith("Шаг 2") && stage() === faceSvg("F3", "B2"), "half-speed playback reveals the brows");
    simultaneous.click();

    check(slider.type === "range" && slider.step === "1" && !slider.disabled, "native range with step one");
    check([...document.querySelectorAll('input[name="standard"]')].map(radio => radio.value).join() === "1,2",
      "standards listed in numeric order");
    check(slider.min === "0" && slider.max === "14" && slider.max === String(StepnovMethod.scale.maxOrder), "range endpoints");
    check(slider.labels.length === 1 && slider.getAttribute("aria-valuetext").startsWith("Порядок 8"), "accessible label and initial value");
    check(input.value === "1e8" && slider.value === "8", "initial powers-of-ten comparison");
    check(byId("comparison-summary").textContent === "Порядок B выше на 1", "initial comparison of decimal orders");
    check(!byId("panel-a").querySelector(".readout").textContent.includes(input.value), "the exact value appears only in the input");
    check(byId("brow-key").children.length === 3 && byId("brow-key").querySelectorAll("svg").length === 3
      && !byId("legend").querySelector(".face-brows"), "separate keys for the three brow positions and the mouths");
    check(!document.querySelector(".input-examples").open, "input examples are tucked away");
    check(byId("order-ticks").children.length === 15, "all ticks");
    check([...document.querySelectorAll(".tick-major sup")].map(tick => tick.textContent).join() === "0,3,6,9,12,14",
      "endpoints and group boundaries use the same power notation");
    byId("number-access").open = true;
    byId("number-access").dispatchEvent(nativeEvent("toggle"));
    check(byId("number-text").readOnly && byId("number-text").value.includes("Исходная запись: 1e8"),
      "selectable plain text reads the classified value");
    byId("voice-item").value = "1";
    byId("voice-item").dispatchEvent(nativeEvent("change"));
    check(byId("number-text").value.includes("Значение B") && byId("number-text").value.includes("Исходная запись: 1e9"),
      "text channel switches to B");
    byId("number-text").focus();
    check(document.activeElement === byId("number-text"), "keyboard focus reaches the text output");
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { getVoices: () => [] } });
    byId("voice-speak").click();
    check(byId("voice-status").textContent.includes("недоступен") && byId("number-text").value.includes("1e9"), "missing local speech leaves the text usable");
    const voice = { name: "Microsoft Irina - Russian (Russia)", lang: "ru-RU", localService: true };
    const spoken = [];
    let voices = [];
    let cancellations = 0;
    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: class { constructor(text) { this.text = text; } } });
    const synth = new EventTarget();
    synth.getVoices = () => voices;
    synth.cancel = () => { cancellations += 1; spoken.length = 0; };
    synth.speak = utterance => { spoken.push(utterance); };
    Object.defineProperty(synth, "speaking", { get: () => spoken.length > 0 });
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: synth });
    byId("voice-speak").click();
    check(!spoken.length && byId("voice-status").textContent.includes("Загружаются"), "first speech click waits for local voices");
    voices = [{ name: "Microsoft Pavel", lang: "ru-RU", localService: true }, voice];
    synth.dispatchEvent(nativeEvent("voiceschanged"));
    check(spoken.length > 0 && cancellations === 0 && !byId("voice-status").textContent,
      "speech starts when voices arrive without a second click or an initial cancel");
    check(spoken.length > 1 && spoken.every(part => part.voice === voice)
      && spoken.map(part => part.text).join("") === byId("number-text").value,
      "speech reads the complete selectable text and prefers the local female voice");
    const spokenText = spoken.map(part => part.text).join("");
    check(document.querySelectorAll(".channel-controls select").length === 1 && spokenText.includes("Исходная запись: 1e9")
      && spokenText.includes("Порядок 9") && spokenText.includes("Стиснутые губы. Нахмуренные брови."),
      "the only speech mode includes B's source, order and approved names");
    byId("voice-stop").click();
    check(spoken.length === 0, "stop clears the entire speech queue");
    const loadedVoices = voices;
    voices = [];
    byId("voice-speak").click();
    byId("voice-stop").click();
    voices = loadedVoices;
    synth.dispatchEvent(nativeEvent("voiceschanged"));
    check(!spoken.length && !byId("voice-status").textContent, "stop also cancels a pending voice load");
    byId("number-access").open = false;

    const faceIds = ["F0", "F1", "F3", "F2", "F4"];
    const browIds = ["B0", "B1", "B2"];
    for (let order = 0; order <= 14; order += 1) {
      slide(order);
      const group = Math.floor(order / 3);
      check(input.value === `1e${order}` && status() === `Позиция A · ${order}`
        && slider.valueAsNumber === order && selectedFace() === group
        && stage() === faceSvg(faceIds[group], browIds[order % 3]), `order ${order}, SVG and legend`);
    }
    check(!byId("number-status").textContent && document.querySelectorAll('.comparison [role="status"], .comparison [aria-live]').length === 0,
      "moving the slider produces no competing live announcements");
    slider.dispatchEvent(nativeEvent("change"));
    const announced = byId("number-status").textContent;
    check(announced.includes("Оскал") && !announced.includes("порядок")
      && slider.getAttribute("aria-valuetext").includes("Порядок 14"), "committing adds the face without repeating the slider order");
    const observer = new MutationObserver(() => {});
    observer.observe(byId("number-status"), { childList: true });
    slider.dispatchEvent(nativeEvent("change"));
    check(observer.takeRecords().length === 0, "a repeated commit does not rewrite the announcement");
    observer.disconnect();
    const originals = [["  −0006.0200e+8  ", 8], ["0001.0000", 0], ["10^14", 14], ["-99.99", 1]];
    for (const [original, order] of originals) {
      setA(original);
      check(input.value === original && slider.valueAsNumber === order, `exact manual input at order ${order}`);
    }
    setA("0.01");
    check(byId("comparison-summary").textContent === "Порядок A выше на 4" && slider.value === "13"
      && range() === "Окно 10^-15 … 10^-1" && stage() === faceSvg("F4", "B1"),
      "fraction moves to the negative window while the comparison remains exact");
    setA("1,5");
    check(input.value === "1,5" && byId("panel-a").querySelector(".readout").textContent.includes("1.5")
      && byId("comparison-summary").hidden, "decimal comma gets a useful correction without changing the input");
    setA("-99.99");
    for (const [original, message] of [
      ["0", "Нет положения"], ["−0", "Нет положения"], ["∞", "Нет положения"], ["−∞", "Нет положения"],
      ["NaN", "Нет положения"], ["oops", "Нет положения"], ["", "Нет положения"],
      ["10^10^10^100", "Нет положения"]
    ]) {
      setA(original);
      check(input.value === original && slider.value === "1" && slider.hasAttribute("data-unset")
        && slider.getAttribute("aria-valuetext").startsWith(message) && status() === message
        && selectedFace() === -1 && range() === "Окно 10^0 … 10^14", `no position for ${original || "empty input"}`);
    }
    slider.focus();
    slider.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true, cancelable: true }));
    check(document.activeElement === slider && input.value === "1e0" && !slider.hasAttribute("data-unset"), "keyboard re-entry at minimum");
    setA("NaN");
    slider.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true, cancelable: true }));
    check(input.value === "1e14" && !slider.hasAttribute("data-unset"), "keyboard re-entry at maximum");
    slider.stepDown();
    slider.dispatchEvent(nativeEvent("input"));
    check(input.value === "1e13", "native range step");
    setA("∞");
    slider.click();
    check(input.value === "1e13" && !slider.hasAttribute("data-unset"), "re-entry at retained pointer position");

    sequential.click();
    byId("speed").value = "2";
    slide(9);
    check(phase().textContent.startsWith("1.") && stage() === faceSvg("F2", "B1")
      && !byId("panel-a").querySelector(".readout").textContent.includes("Нахмуренные брови"),
      "moving in Sequential previews the mouth without revealing the brows");
    slider.dispatchEvent(nativeEvent("change"));
    check(phase().textContent.startsWith("Шаг 1") && stage() === faceSvg("F2", "B1"), "Sequential commit begins with mouth");
    await wait(500);
    check(phase().textContent.startsWith("Шаг 2") && stage() === faceSvg("F2", "B0")
      && byId("number-status").textContent.includes("Нахмуренные брови"),
      "Sequential reveals the brow and announces the first committed cycle");
    slide(10, true);
    const neutralStart = performance.now();
    await wait(4800);
    check(phase().textContent.includes("5 с") && stage() === faceSvg("F2", "B1"), "neutral wait does not accelerate at 2x");
    await wait(260);
    check(performance.now() - neutralStart >= 5000 && phase().textContent === "Передача завершена", "neutral rule completes after five seconds");
    await wait(460);
    check(phase().textContent.includes("5 с") && stage() === faceSvg("F2", "B1"), "Sequential repeats the neutral phase");
    for (let index = 0; index < 300; index += 1) slide(index % 15, true);
    slide(8);
    simultaneous.click();
    await wait(500);
    check(input.value === "1e8" && stage() === faceSvg("F3", "B2") && phase().hidden, "rapid movement and standard switch leave current SVG");
    const stageA = document.querySelector("#panel-a .stage");
    const animations = () => stageA.getAnimations({ subtree: true });
    const [browAnimation, mouthAnimation] = animations();
    const baseline = slider.getBoundingClientRect().top;
    check(animations().length === 2 && [browAnimation, mouthAnimation].every(animation => {
      const timing = animation.effect.getTiming();
      return timing.iterations === Infinity && timing.duration === 1000;
    }), "both features loop at 2x");
    function sample(time) {
      return [browAnimation, mouthAnimation].map(animation => {
        animation.pause();
        animation.currentTime = time;
        return getComputedStyle(animation.effect.target).transform;
      }).join("|");
    }
    const fullExpression = sample(0);
    const relaxedExpression = sample(520);
    check(relaxedExpression !== fullExpression && !relaxedExpression.includes("none"), "both features move together");
    check(sample(1000) === fullExpression && sample(1520) === relaxedExpression, "the second cycle repeats the same motion");
    check([...stageA.querySelectorAll("svg, circle, .face-mouth, .face-brows")].every(node => {
      const style = getComputedStyle(node);
      return style.visibility === "visible" && style.opacity === "1";
    }), "face and features remain visible throughout the cycle");
    check(slider.getBoundingClientRect().top === baseline, "expression motion keeps the slider in place");
    byId("motion").click();
    check(!animations().length && stage() === faceSvg("F3", "B2") && byId("speed").disabled, "unchecking animation restores a static expression");
    byId("speed").value = "1";
    byId("motion").click();
    check(animations().length === 2 && animations().every(animation => animation.effect.getTiming().duration === 2000),
      "1x runs a two-second cycle");
    byId("speed").value = "0.5";
    byId("speed").dispatchEvent(nativeEvent("change"));
    check(animations().length === 2 && animations().every(animation => animation.effect.getTiming().duration === 4000),
      "changing speed to 0.5x extends the cycle");
    slide(10);
    check(animations().length === 1 && animations()[0].effect.target.matches(".face-mouth"), "neutral brows remain still in Simultaneous");
    setA("0");
    check(!animations().length && stageA.querySelector("ellipse"), "special values stay visible");
    slide(11);
    check(byId("input-b").value === reference, "reference value unchanged");
    const inputB = byId("input-b");
    const original = "  −1.00e+1000  ";
    setA(original);
    check(input.value === original && slider.value === "10" && range() === "Окно 10^990 … 10^1004"
      && stage() === faceSvg("F2", "B1"), "manual exponent 1000 auto-positions the ruler");
    check([...document.querySelectorAll(".tick-major sup")].map(tick => tick.textContent).join() === "990,993,996,999,1002,1004",
      "major tick labels move with the window");
    check(inputB.value === "1e999" && byId("panel-b").querySelector("svg"), "B follows A into the automatic window");
    inputB.value = "  −1.2500e+999  ";
    inputB.dispatchEvent(nativeEvent("input"));
    byId("window-next").click();
    check(range() === "Окно 10^1005 … 10^1019" && input.value === "1e1005" && slider.value === "0"
      && !slider.hasAttribute("data-unset") && stage() === faceSvg("F0", "B0"),
      "next window puts A and the slider at the first position");
    check(inputB.value === "  −1.2500e1014  " && byId("panel-b").querySelector("svg"),
      "B follows a manual window shift with its sign, coefficient and face intact");
    check(byId("window-mode").textContent.includes("Вручную") && byId("window-mode").textContent.includes("Новое окно"),
      "moving to a new window visibly selects manual mode");
    setA("1e-15");
    check(range() === "Окно 10^1005 … 10^1019" && slider.hasAttribute("data-unset"), "editing A preserves the manual window");
    setA(original);
    byId("window-prev").click();
    check(range() === "Окно 10^990 … 10^1004" && slider.value === "0" && input.value === "1e990"
      && inputB.value === "  −1.2500e999  ", "previous window resets A to its start and shifts B back");
    byId("window-prev").click();
    setA(original);
    byId("window-auto").click();
    check(range() === "Окно 10^990 … 10^1004" && input.value === original && slider.value === "10", "reset selects the automatic window for A");
    slide(14);
    check(input.value === "1e1004" && stage() === faceSvg("F4", "B2") && inputB.value === "  −1.2500e999  ",
      "slider writes the exact global exponent to A and leaves B in the same window");

    for (const [order, start, position] of [
      [-16, -30, 14], [-15, -15, 0], [-1, -15, 14], [0, 0, 0], [14, 0, 14],
      [15, 15, 0], [29, 15, 14], [30, 30, 0], [100, 90, 10], [1007, 1005, 2]
    ]) {
      setA(`1e${order}`);
      check(slider.value === String(position) && range() === `Окно 10^${start} … 10^${start + 14}`
        && stage() === faceSvg(faceIds[Math.floor(position / 3)], browIds[position % 3]), `automatic window for order ${order}`);
    }

    const huge = 9999999999999999999999999999999999999999n;
    setA(`1e-${huge}`);
    const hugeResult = StepnovMethod.classify(input.value);
    const hugeStart = BigInt(hugeResult.scale_start);
    check(range() === `Окно 10^${hugeStart} … 10^${hugeStart + 14n}` && !byId("local-tick-note").hidden
      && document.querySelector(".tick-major").textContent === "+0", "long exponents remain exact with readable local ticks");
    byId("window-prev").click();
    check(range() === `Окно 10^${hugeStart - 15n} … 10^${hugeStart - 1n}` && input.value === `1e${hugeStart - 15n}`
      && inputB.value === `  −1.2500e${hugeStart - 6n}  ` && slider.value === "0", "navigation retains full precision on huge negative exponents");
    slide(3);
    check(input.value === `1e${hugeStart - 12n}` && slider.value === "3" && stage() === faceSvg("F1", "B0"),
      "slider movement retains full precision on huge negative exponents");

    inputB.value = "  −9.990e100  ";
    inputB.dispatchEvent(nativeEvent("input"));
    check(range() === `Окно 10^${hugeStart - 15n} … 10^${hugeStart - 1n}` && inputB.value === "  −9.990e100  "
      && slider.value === "3" && input.value === `1e${hugeStart - 12n}`, "editing B never moves the window");
    byId("window-auto").click();
    inputB.value = "1e500";
    inputB.dispatchEvent(nativeEvent("input"));
    check(range() === `Окно 10^${hugeStart - 15n} … 10^${hugeStart - 1n}`, "Auto mode follows A, not B");
    inputB.value = "  −9.990e100  ";
    inputB.dispatchEvent(nativeEvent("input"));
    setA("1e100");
    slide(10);
    check(input.value === "1e100" && inputB.value === "  −9.990e100  "
      && byId("comparison-summary").textContent === "Одинаковый десятичный порядок", "shared window compares equal orders");
    inputB.value = "NaN";
    inputB.dispatchEvent(nativeEvent("input"));
    check(range() === "Окно 10^90 … 10^104" && slider.value === "10" && inputB.value === "NaN", "special B input leaves the shared window in place");
    setA("∞");
    slider.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true }));
    check(input.value === "1e99" && slider.value === "9", "after a special value Left steps from the retained position");
    setA("NaN");
    slider.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    check(input.value === "1e100" && slider.value === "10", "after a special value Right steps from the retained position");
    byId("speed").value = "2";
    sequential.click();
    slide(9, true);
    check(input.value === "1e99" && phase().textContent.startsWith("Шаг 1"), "Sequential uses the same offset slider");
    await wait(500);
    check(phase().textContent.startsWith("Шаг 2") && stage() === faceSvg("F2", "B0"), "windowed loop plays the eyebrows");
    await wait(900);
    check(phase().textContent.startsWith("Шаг 1"), "windowed loop repeats the Sequential cycle");
    byId("motion").click();
    await wait(470);
    check(phase().textContent.startsWith("1."), "unchecking animation stops the Sequential loop");
    setA("1e0");
    inputB.value = "−25.00";
    inputB.dispatchEvent(nativeEvent("input"));
    byId("window-next").click();
    check(inputB.value === "−25.00e15" && byId("panel-b").querySelector("svg"),
      "a decimal B follows the window without losing trailing zeroes");
    inputB.value = "10^16";
    inputB.dispatchEvent(nativeEvent("input"));
    byId("window-next").click();
    check(inputB.value === "10^16" && byId("panel-b").querySelector(".readout").textContent.includes("Вне текущего окна"),
      "changing windows preserves a symbolic B exactly");
    check(performance.getEntriesByType("resource").every(resource => resource.name.startsWith("file:")), "all resources load locally");
    document.body.style.zoom = "2";
    check(document.documentElement.scrollWidth === document.documentElement.clientWidth, "main demo reflows at 200% zoom");
    document.body.style.zoom = "";

    const page = document.documentElement.cloneNode(true);
    page.querySelector("#slider-test-script").remove();
    page.querySelector("#slider-test-result").remove();
    page.querySelector(".nav-toggle").remove();
    for (const width of [320, 360, 390, 448, 500, 700, 1025, 1440]) {
      const frame = document.createElement("iframe");
      frame.width = width;
      frame.height = 2200;
      frame.style.border = "0";
      frame.srcdoc = "<!doctype html>" + page.outerHTML;
      await new Promise(resolve => {
        frame.addEventListener("load", resolve, { once: true });
        document.body.append(frame);
      });
      const doc = frame.contentDocument;
      const root = doc.documentElement;
      const localSlider = doc.getElementById("order-slider");
      check(frame.contentWindow.innerWidth === width && root.scrollWidth === root.clientWidth, `${width}px layout without horizontal overflow`);
      const bounds = localSlider.getBoundingClientRect();
      check(bounds.height >= 44 && bounds.width >= Math.min(280, width), `slider target at ${width}px`);
      const options = doc.getElementById("speed").closest("details");
      check(options.open === (width > 672), `speed disclosure adapts at ${width}px`);
      doc.getElementById("motion").click();
      for (const standard of [2, 1]) {
        doc.querySelector(`input[name="standard"][value="${standard}"]`).click();
        const tops = new Set();
        for (let order = 0; order <= 14; order += 1) {
          localSlider.value = order;
          localSlider.dispatchEvent(nativeEvent("input"));
          tops.add(localSlider.getBoundingClientRect().top);
        }
        check(tops.size === 1, `slider stays in place across orders at ${width}px, Standard ${standard} (positions: ${[...tops].join()})`);
        if (width <= 500) {
          const firstFace = doc.querySelector("#panel-a .face").getBoundingClientRect();
          const sliderBottom = localSlider.getBoundingClientRect().bottom;
          check(sliderBottom - firstFace.top <= 844, `both faces and the slider fit within one screen at ${width}px, Standard ${standard}`);
        }
      }
      check(doc.getElementById("input-a").value === "1e14", `slider updates input at ${width}px`);
      frame.remove();
    }
    check(!jsErrors.length, "no script errors");
    pass();
  } catch (error) {
    output.textContent = `FAIL after ${checks.length} checks: ${error.message}`;
  }
});
</script>
'@

try {
    Copy-Item -LiteralPath (Join-Path $root 'src') -Destination $scratch -Recurse
    Copy-Item -LiteralPath (Join-Path $root 'examples') -Destination $scratch -Recurse
    $html = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $root 'index.html')
    $testPage = Join-Path $scratch 'index.html'
    Set-Content -LiteralPath $testPage -Encoding utf8 -Value $html.Replace('</body>', ($testScript + '</body>'))
    $uri = ([uri]$testPage).AbsoluteUri
    $spacePage = Join-Path $scratch 'examples/space-navigation.html'
    $spaceHtml = Get-Content -Raw -Encoding UTF8 -LiteralPath $spacePage
    Set-Content -LiteralPath $spacePage -Encoding utf8 -Value $spaceHtml.Replace('</body>', ($testScript + '</body>'))
    $aboutPage = Join-Path $scratch 'about.html'
    $aboutHtml = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $root 'about.html')
    Set-Content -LiteralPath $aboutPage -Encoding utf8 -Value $aboutHtml.Replace('</body>', ($testScript + '</body>'))
    foreach ($mode in @('default', 'reduced', 'space', 'locales-main', 'locales-space', 'locales-about', 'persist')) {
        $flags = '--virtual-time-budget=18000'
        $target = $uri + '?lang=ru&theme=light'
        if ($mode -eq 'reduced') {
            $flags += ' --force-prefers-reduced-motion'
            $target += '&reduced'
        }
        if ($mode -eq 'space') {
            $target = ([uri]$spacePage).AbsoluteUri + '?lang=ru&theme=light&space'
        }
        if ($mode -eq 'locales-main') { $target += '&locales'; $flags += ' --force-dark-mode' }
        if ($mode -eq 'locales-space') { $target = ([uri]$spacePage).AbsoluteUri + '?lang=ru&space&locales' }
        if ($mode -eq 'locales-about') { $target = ([uri]$aboutPage).AbsoluteUri + '?lang=ru&about&locales' }
        if ($mode -eq 'persist') { $target = $uri + '?persist' }
        $profile = Join-Path $scratch $mode
        $log = Join-Path $scratch ($mode + '.log')
        $arguments = "--headless=new --disable-gpu --disable-background-networking --no-first-run --window-size=1440,1100 --user-data-dir=`"$profile`" --dump-dom $flags `"$target`""
        $process = Start-Process -FilePath $EdgePath -ArgumentList $arguments -WindowStyle Hidden -Wait -PassThru -RedirectStandardOutput $log
        $document = Get-Content -Raw -Encoding UTF8 -LiteralPath $log
        $result = [regex]::Match($document, '<output id="slider-test-result">([^<]*)</output>').Groups[1].Value
        if ($process.ExitCode -ne 0 -or !$result.StartsWith('PASS')) {
            throw "Browser test failed ($mode), exit $($process.ExitCode). $result"
        }
        "$mode - $result"
    }
} finally {
    $resolved = (Resolve-Path -LiteralPath $scratch).Path
    if ($resolved -eq $scratch -and (Split-Path -Leaf $resolved) -match '^stepnov-slider-[a-f0-9-]+$') {
        Remove-Item -LiteralPath $resolved -Recurse -Force
    }
}
