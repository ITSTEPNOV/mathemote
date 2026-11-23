(function (factory) {
  "use strict";

  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./locales.js"));
  } else {
    globalThis.StepnovChannels = factory(globalThis.StepnovLocales);
  }
})(function (locales) {
  "use strict";

  // Voice objects expose names and languages, but no gender metadata.
  const femaleVoice = /\b(?:Irina|Zira|Hazel|Susan|Catherine|Linda|Heera|Huihui|Yaoyao|Hoda|Hortense|Julie|Caroline|Hedda|Katja|Kalpana|Ayumi|Haruka|Maria|Helia|Helena|Laura|Sabina)\b/i;

  function text(value, detailed = false, language = "ru") {
    const t = (key, values) => locales.translate(language, key, values);
    const sign = value.sign === "zero" ? "zeroSign" : value.sign;
    const parts = detailed && value.original ? [t("source", { value: value.original })] : [];
    if (sign) parts.push(t("sign", { value: t(sign) }));
    if (value.magnitude_order !== null) parts.push(`${t("order", { n: value.magnitude_order })}.`);
    if (value.scale_start !== null) parts.push(t("offset", { n: value.scale_start }));
    if (value.status === "finite") {
      if (detailed) parts.push(`${t("position", { n: value.scale_position })}.`);
      parts.push(t("faceNumber", { n: value.face_index + 1 }), `${t(value.face_id)}. ${t(value.brow_id)}.`);
      if (detailed) {
        parts.push(t(value.standard === 1 ? (value.brow_index === 1 ? "seqVoiceWait" : "seqVoice") : "simSummary"));
      }
    } else {
      parts.push(t(value.reason ?? value.status));
    }
    return parts.join(" ");
  }

  function speakLocal(message, host, onError, language = "ru") {
    try {
      const synth = host.speechSynthesis;
      const tag = value => value.toLowerCase().replaceAll("_", "-");
      const requested = tag(language);
      const voices = synth?.getVoices().filter(item => item.localService === true) ?? [];
      const languageVoices = voices.filter(item => tag(item.lang).split("-")[0] === requested.split("-")[0]);
      const exact = languageVoices.filter(item => tag(item.lang) === requested);
      const preferred = candidates => candidates.find(item => femaleVoice.test(item.name ?? "")) ?? candidates[0];
      const voice = preferred(exact) ?? preferred(languageVoices);
      if (!voice || typeof host.SpeechSynthesisUtterance !== "function") return false;

      // Keep individual utterances short, splitting at spaces or CJK sentence endings when possible.
      const segments = message.match(/.{1,119}(?:\s|[。！？]|$)|.{1,120}/gsu) ?? [];
      if (synth.speaking || synth.pending || synth.paused) synth.cancel();
      for (const segment of segments) {
        const utterance = new host.SpeechSynthesisUtterance(segment);
        utterance.voice = voice;
        utterance.lang = voice.lang;
        utterance.onerror = event => {
          if (event.error !== "canceled" && event.error !== "interrupted") onError();
        };
        synth.speak(utterance);
      }
      return true;
    } catch {
      return false;
    }
  }

  function mount(container, getOptions) {
    if (!container.querySelector("#voice-item")) container.insertAdjacentHTML("beforeend", `
      <div class="channel-controls">
        <label><span data-i18n="value"></span> <select id="voice-item"></select></label>
        <button id="voice-speak" type="button" data-i18n="speak"></button>
        <button id="voice-stop" type="button" data-i18n="stop"></button>
      </div>
      <label for="number-text" data-i18n="text"></label>
      <textarea id="number-text" rows="4" readonly></textarea>
      <p class="channel-status" id="voice-status" role="status"></p>
    `);
    const select = container.querySelector("#voice-item");
    const output = container.querySelector("#number-text");
    const status = container.querySelector("#voice-status");
    const speak = container.querySelector("#voice-speak");
    const stop = container.querySelector("#voice-stop");
    const { t, language } = StepnovUI;
    const noVoice = () => { status.textContent = t("noVoice"); };
    let options = [];
    let clearVoiceWait;

    function stopWaiting() {
      clearVoiceWait?.();
      clearVoiceWait = undefined;
    }

    const restoreFocusRing = () => select.removeAttribute("data-pointer-focus");
    select.addEventListener("pointerdown", () => select.setAttribute("data-pointer-focus", ""));
    select.addEventListener("keydown", restoreFocusRing);
    select.addEventListener("blur", restoreFocusRing);

    function updateText() {
      const entry = options[select.value];
      const message = entry ? `${entry.label}. ${entry.context ? entry.context + " " : ""}${text(entry.result, true, language())}` : "";
      if (output.value !== message) output.value = message;
      speak.disabled = !entry;
    }

    function refresh() {
      if (!container.open) return;
      const next = getOptions();
      if (next.length !== options.length || next.some((item, index) => item.label !== options[index].label)) {
        const previous = options[select.value]?.id;
        select.replaceChildren(...next.map((item, index) => new Option(item.label, String(index))));
        const index = next.findIndex(item => item.id === previous);
        if (index >= 0) select.value = String(index);
      }
      options = next;
      updateText();
    }

    select.addEventListener("change", updateText);
    container.addEventListener("toggle", () => {
      refresh();
      if (container.open) globalThis.speechSynthesis?.getVoices();
    });
    speak.addEventListener("click", () => {
      if (!options[select.value]) return;
      const locale = language();
      const message = output.value;
      const start = () => speakLocal(message, globalThis, () => { status.textContent = t("speechFailed"); }, locale);
      stopWaiting();
      status.textContent = "";
      if (start()) return;
      const synth = globalThis.speechSynthesis;
      if (!synth?.addEventListener || typeof globalThis.SpeechSynthesisUtterance !== "function") {
        noVoice();
        return;
      }

      const waiting = t("voiceLoading");
      status.textContent = waiting;
      const finish = started => {
        stopWaiting();
        if (!started) noVoice();
        else if (status.textContent === waiting) status.textContent = "";
      };
      const retry = () => { if (start()) finish(true); };
      const deadline = setTimeout(() => finish(start()), 2500);
      synth.addEventListener("voiceschanged", retry);
      clearVoiceWait = () => {
        clearTimeout(deadline);
        synth.removeEventListener("voiceschanged", retry);
      };
    });
    stop.addEventListener("click", () => {
      stopWaiting();
      globalThis.speechSynthesis?.cancel();
      status.textContent = "";
    });
    addEventListener("stepnov-language", () => {
      stopWaiting();
      status.textContent = "";
    });
    return refresh;
  }

  return Object.freeze({ text, speakLocal, mount });
});
