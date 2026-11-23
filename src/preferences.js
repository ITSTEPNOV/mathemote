(() => {
  "use strict";
  const { languages, resolve, translate } = StepnovLocales;
  const query = new URLSearchParams(location.search);
  const themes = ["system", "light", "dark"];
  const store = key => {
    try { return localStorage.getItem(`stepnov-${key}`); } catch { return null; }
  };
  const save = (key, value) => {
    try { localStorage.setItem(`stepnov-${key}`, value); } catch { /* File storage may be disabled. */ }
  };
  let language = Object.hasOwn(languages, query.get("lang")) ? query.get("lang") : resolve([store("lang"), ...navigator.languages]);
  let theme = [query.get("theme"), store("theme")].find(value => themes.includes(value)) ?? "system";

  const root = document.documentElement;
  const t = (key, values) => translate(language, key, language === "ar" && values && Object.hasOwn(values, "n")
    ? { ...values, n: `\u2066${values.n}\u2069` } : values);
  function applyRoot() {
    root.lang = language;
    root.dir = language === "ar" ? "rtl" : "ltr";
    root.dataset.theme = theme;
  }
  applyRoot();

  function unitNumber(value) {
    const [integer, fraction] = value.split(".");
    const format = new Intl.NumberFormat(language);
    const whole = format.format(BigInt(integer));
    if (!fraction) return whole;
    const decimal = format.formatToParts(1.1).find(part => part.type === "decimal").value;
    return whole + decimal + [...fraction].map(digit => format.format(BigInt(digit))).join("");
  }

  function updateMarkup() {
    for (const node of document.querySelectorAll("[data-i18n]")) node.textContent = t(node.dataset.i18n);
    for (const node of document.querySelectorAll("[data-i18n-label]")) node.setAttribute("aria-label", t(node.dataset.i18nLabel));
    document.getElementById("language-code").textContent = language.split("-")[0].toUpperCase();
    document.getElementById("language").title = `${t("language")} · ${languages[language]}`;
    document.getElementById("theme").title = `${t("theme")} · ${t(theme)}`;
    for (const node of document.querySelectorAll("[data-unit-value]")) {
      node.textContent = unitNumber(node.dataset.unitValue)
        + (node.dataset.unit ? ` ${t(node.dataset.unit)}` : node.dataset.suffix ?? "");
    }
    document.title = `${t(document.body.dataset.page)} · ${t("product")}`;
    for (const link of document.querySelectorAll("[data-page-link]")) {
      const url = new URL(link.getAttribute("href"), location.href);
      url.searchParams.set("lang", language);
      url.searchParams.set("theme", theme);
      link.href = url.href;
    }
  }

  function remember(key, value) {
    save(key, value);
    const url = new URL(location.href);
    url.searchParams.set(key, value);
    try { history.replaceState(null, "", url); } catch { /* Storage and page links still carry the preference. */ }
  }

  function mountNavigation() {
    const nav = document.getElementById("page-nav");
    const toggle = document.createElement("button");
    toggle.className = "nav-toggle";
    toggle.type = "button";
    toggle.dataset.i18nLabel = "pages";
    toggle.setAttribute("aria-controls", nav.id);
    toggle.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
    nav.before(toggle);

    const narrow = matchMedia("(max-width: 46rem)");
    function showMenu(open) {
      toggle.setAttribute("aria-expanded", String(open));
      nav.hidden = narrow.matches && !open;
    }
    function fitLayout() {
      const restoreFocus = narrow.matches && nav.contains(document.activeElement);
      toggle.hidden = !narrow.matches;
      showMenu(false);
      if (restoreFocus) toggle.focus();
    }
    fitLayout();
    narrow.addEventListener("change", fitLayout);
    toggle.addEventListener("click", () => showMenu(nav.hidden));
    nav.parentElement.addEventListener("keydown", event => {
      if (event.key !== "Escape" || toggle.getAttribute("aria-expanded") !== "true") return;
      showMenu(false);
      toggle.focus();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    mountNavigation();
    const container = document.getElementById("preferences");
    container.innerHTML = `
      <label class="preference-control">
        <span class="sr-only" data-i18n="language"></span>
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>
        </svg>
        <bdi id="language-code" aria-hidden="true"></bdi>
        <select id="language"></select>
      </label>
      <label class="preference-control">
        <span class="sr-only" data-i18n="theme"></span>
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1.5-3.3 1.5 1.5 0 0 1 1.1-2.5h1.6A3.8 3.8 0 0 0 21 11.4C21 6.8 16.8 3 12 3Z"/>
          <circle cx="7.4" cy="10.5" r=".75"/><circle cx="11.3" cy="7.2" r=".75"/><circle cx="16" cy="8.9" r=".75"/>
        </svg>
        <select id="theme"></select>
      </label>`;
    const languageSelect = document.getElementById("language");
    const themeSelect = document.getElementById("theme");
    for (const [code, label] of Object.entries(languages)) {
      const option = new Option(label, code);
      option.lang = code;
      languageSelect.add(option);
    }
    for (const value of themes) {
      const option = new Option("", value);
      option.dataset.i18n = value;
      themeSelect.add(option);
    }
    languageSelect.value = language;
    themeSelect.value = theme;
    updateMarkup();
    languageSelect.addEventListener("change", () => {
      language = languageSelect.value;
      globalThis.speechSynthesis?.cancel();
      applyRoot();
      updateMarkup();
      remember("lang", language);
      dispatchEvent(new Event("stepnov-language"));
    });
    themeSelect.addEventListener("change", () => {
      theme = themeSelect.value;
      applyRoot();
      updateMarkup();
      remember("theme", theme);
    });
  });

  function describe(value) {
    const words = [];
    if (value.sign === "negative") words.push(t("sign", { value: t("negative") }));
    if (value.status === "finite") words.push(`${t(value.face_id)}. ${t(value.brow_id)}.`);
    else words.push(t(value.reason ?? value.status));
    if (value.magnitude_order !== null) words.push(t("decimalOrder", { n: value.magnitude_order }));
    return words.join(" ");
  }

  globalThis.StepnovUI = Object.freeze({ t, describe, unitNumber, language: () => language });
})();
