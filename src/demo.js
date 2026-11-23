(() => {
  "use strict";

  const { classify, faces, brows, scale } = globalThis.StepnovMethod;
  const { t, describe } = StepnovUI;
  const { draw, drawBrows } = globalThis.StepnovFaces;
  const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
  const wideLayout = matchMedia("(width > 42rem)");
  const find = id => document.getElementById(id);
  const motion = find("motion");
  const speed = find("speed");
  const playbackOptions = speed.closest("details");
  const play = find("play");
  const slider = find("order-slider");
  const orderStatus = find("order-status");
  const comparisonSummary = find("comparison-summary");
  const windowRange = find("window-range");
  const windowMode = find("window-mode");
  const localTickNote = find("local-tick-note");
  const ticks = find("order-ticks");
  const legend = find("legend");
  const panels = ["a", "b"].map(id => {
    const element = find(`panel-${id}`);
    return {
      input: find(`input-${id}`), stage: element.querySelector(".stage"),
      readout: element.querySelector(".readout"), phase: element.querySelector(".phase"),
      timer: null, result: null
    };
  });
  const [panelA, panelB] = panels;
  const numberStatus = find("number-status");
  const refreshChannels = StepnovChannels.mount(find("number-access"),
    () => panels.map((panel, index) => ({ id: index, label: t(index === 0 ? "valueA" : "valueB"), result: panel.result })));
  const windowSize = BigInt(scale.size);
  const statusSymbols = { infinity: "∞", nan: "NaN", out_of_window: "-", order_unavailable: "-", invalid: "-" };
  let standard = Number(document.querySelector('input[name="standard"]:checked').value);
  let windowStart = 0n;
  let automatic = true;
  let windowChanged = false;

  function createText(tag, className, value) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = value;
    return element;
  }

  function drawStage(panel, value, brow = value.brow_id) {
    panel.stage.replaceChildren();
    if (value.sign === "negative") panel.stage.append(createText("span", "minus", "−"));
    if (value.face_id) {
      const picture = document.createElement("div");
      picture.className = "picture";
      picture.innerHTML = draw(value.face_id, brow ?? "B1");
      if (standard === 2 && motion.checked && value.status === "finite") {
        picture.classList.add("is-looping");
        picture.style.setProperty("--expression-period", `${2 / Number(speed.value)}s`);
      }
      panel.stage.append(picture);
    } else {
      panel.stage.append(createText("span", "special", statusSymbols[value.status]));
    }
  }

  function clearPlayback(panel) {
    clearTimeout(panel.timer);
    panel.timer = null;
  }

  function render(panel) {
    clearPlayback(panel);
    const value = classify(panel.input.value, standard, windowStart);
    panel.result = value;
    const preview = standard === 1 && motion.checked && value.status === "finite";
    drawStage(panel, value, preview ? "B1" : value.brow_id);
    const decimalComma = value.reason === "syntax" && /^[+−-]?\d+,\d+(?:e[+−-]?\d+)?$/i.test(value.original.trim());
    const description = decimalComma
      ? t("comma", { value: value.original.trim().replace(",", ".") })
      : preview ? t(value.face_id) : describe(value);
    if (panel.readout.textContent !== description) panel.readout.textContent = description;
    panel.input.setAttribute("aria-invalid", String(value.status === "invalid" && value.reason !== "empty"));
    panel.phase.hidden = standard !== 1 || value.status !== "finite";
    if (!panel.phase.hidden) {
      panel.phase.textContent = t(value.brow_id === "B1" ? "seqNeutral" : "seqSummary");
    }
  }

  function playSequence(panel, announce = false) {
    const value = panel.result;
    if (value.status !== "finite") return;
    const label = t(panel === panelA ? "valueA" : "valueB");
    const duration = 900 / Number(speed.value);
    panel.phase.textContent = t(value.brow_id === "B1" ? "seqWait" : "seqStart");
    panel.readout.textContent = t(value.face_id);
    drawStage(panel, value, "B1");
    const complete = () => {
      panel.phase.textContent = t("seqDone");
      panel.readout.textContent = describe(value);
      if (announce && value.brow_id === "B1") numberStatus.textContent = `${label}. ${t("B1")}.`;
      panel.timer = setTimeout(() => playSequence(panel), duration);
    };
    if (value.brow_id === "B1") {
      panel.timer = setTimeout(complete, 5000);
    } else {
      panel.timer = setTimeout(() => {
        drawStage(panel, value);
        panel.phase.textContent = t("seqBrow", { name: t(value.brow_id) });
        panel.readout.textContent = describe(value);
        if (announce) numberStatus.textContent = `${label}. ${panel.phase.textContent}`;
        panel.timer = setTimeout(complete, duration);
      }, duration);
    }
  }

  function updateControls() {
    const hasFiniteValue = panels.some(panel => panel.result.status === "finite");
    speed.disabled = !motion.checked || !hasFiniteValue;
    play.hidden = standard !== 1;
    play.disabled = speed.disabled;

    const { status, magnitude_order: order, scale_position: position, face_index: faceIndex } = panelA.result;
    const hasPosition = position !== null;
    slider.toggleAttribute("data-unset", !hasPosition);
    if (hasPosition && slider.value !== String(position)) slider.value = String(position);
    orderStatus.textContent = hasPosition ? t("positionA", { n: position })
      : t(status === "out_of_window" ? "aOutside" : "unset");
    slider.setAttribute("aria-valuetext", hasPosition ? `${t("order", { n: order })}. ${t("position", { n: position })}`
      : `${orderStatus.textContent}. ${t("sliderHint")}`);

    const [a, b] = panels.map(panel => panel.result);
    let comparison = "";
    if (a.magnitude_order !== null && b.magnitude_order !== null) {
      const difference = BigInt(a.magnitude_order) - BigInt(b.magnitude_order);
      const orders = difference < 0n ? -difference : difference;
      comparison = difference === 0n ? t("same")
        : t(orders === 1n ? "higherOne" : "higher", { value: difference > 0n ? "A" : "B", n: orders });
    }
    comparisonSummary.hidden = !comparison;
    if (comparison !== comparisonSummary.textContent) comparisonSummary.textContent = comparison;
    refreshChannels();

    Array.from(legend.children).forEach((item, index) => {
      item.classList.toggle("current", index === faceIndex);
      if (index === faceIndex) item.setAttribute("aria-current", "true");
      else item.removeAttribute("aria-current");
    });
  }

  function refresh(animate = false) {
    panels.forEach(render);
    updateControls();
    if (animate && standard === 1 && motion.checked) panels.forEach(panel => playSequence(panel));
  }

  function setSliderOrder() {
    panelA.input.value = `1e${windowStart + BigInt(slider.value)}`;
    render(panelA);
    updateControls();
  }

  function commitPanel(panel, sliderChange = false) {
    const label = t(panel === panelA ? "valueA" : "valueB");
    // The native slider already exposes the order as its accessible value.
    const spoken = sliderChange ? { ...panel.result, magnitude_order: null } : panel.result;
    const animated = standard === 1 && motion.checked && panel.result.status === "finite";
    const announcement = `${label}. ${animated ? t(panel.result.face_id) : describe(spoken)}`;
    if (numberStatus.textContent !== announcement) numberStatus.textContent = announcement;
    if (standard === 1 && motion.checked) {
      clearPlayback(panel);
      playSequence(panel, true);
    }
  }

  slider.min = String(scale.minOrder);
  slider.max = String(scale.maxOrder);
  const scaleOrders = [];
  const majorTicks = [];
  const groupLabels = [];
  for (let order = scale.minOrder; order <= scale.maxOrder; order += 1) {
    const value = classify(`1e${order}`);
    scaleOrders.push(value);
    const endpoint = order === scale.minOrder || order === scale.maxOrder;
    const transition = value.brow_index === 0;
    const tick = createText("span", "order-tick", "");
    tick.style.setProperty("--tick-position", `${100 * (order - scale.minOrder) / (scale.maxOrder - scale.minOrder)}%`);
    if (endpoint || transition) {
      tick.classList.add("tick-major");
      majorTicks.push({ tick, position: BigInt(order) });
    }
    ticks.append(tick);
  }

  const browKey = find("brow-key");
  brows.forEach((brow, index) => {
    const item = document.createElement("li");
    const picture = document.createElement("span");
    picture.innerHTML = drawBrows(brow.id);
    const place = createText("span", "", t("place", { n: index + 1 }));
    const name = createText("span", "sr-only", t(brow.id));
    name.dataset.i18n = brow.id;
    item.append(picture, place, name);
    addEventListener("stepnov-language", () => { place.textContent = t("place", { n: index + 1 }); });
    browKey.append(item);
  });

  faces.forEach((face, index) => {
    const item = document.createElement("li");
    const icon = document.createElement("span");
    const orders = scaleOrders.filter(value => value.face_index === index);
    icon.innerHTML = draw(face.id, null);
    const label = createText("span", "legend-orders", "");
    const name = createText("span", "legend-name", t(face.id));
    name.dataset.i18n = face.id;
    item.append(icon, name, label);
    groupLabels.push({ label, first: BigInt(orders[0].scale_position), last: BigInt(orders.at(-1).scale_position) });
    legend.append(item);
  });

  function showWindow() {
    const start = windowStart.toString();
    const end = (windowStart + BigInt(scale.maxOrder)).toString();
    const localTicks = Math.max(start.length, end.length) > 4;
    const powerRange = document.createElement("bdi");
    powerRange.dir = "ltr";
    powerRange.textContent = `10^${start} … 10^${end}`;
    windowRange.replaceChildren(t("window") + " ", powerRange);
    windowMode.textContent = t(automatic ? "autoMode" : "manualMode")
      + (windowChanged ? ` · ${t("newWindow")}` : "");
    find("window-auto").setAttribute("aria-pressed", String(automatic));
    localTickNote.hidden = !localTicks;
    majorTicks.forEach(({ tick, position }) => {
      if (localTicks) tick.textContent = `+${position}`;
      else tick.replaceChildren("10", createText("sup", "", windowStart + position));
    });
    groupLabels.forEach(({ label, first, last }) => {
      label.textContent = localTicks ? `+${first}…+${last}`
        : `${windowStart + first}…${windowStart + last}`;
    });
  }

  function moveWindow(start, animate) {
    windowChanged = start !== windowStart;
    const reference = panelB.result;
    if (windowChanged && reference.scale_position !== null
      && ["decimal", "scientific"].includes(reference.input_kind)) {
      const [, leading, coefficient, exponent = "0", trailing] = reference.original.match(/^(\s*)([^eE\s]+)(?:[eE]([+−-]?\d+))?(\s*)$/);
      const shiftedExponent = BigInt(exponent.replace("−", "-")) + start - windowStart;
      panelB.input.value = `${leading}${coefficient}e${shiftedExponent}${trailing}`;
    }
    windowStart = start;
    showWindow();
    refresh(animate);
    if (windowChanged || animate) numberStatus.textContent = `${windowMode.textContent}. ${windowRange.textContent}`;
  }

  function automaticWindow() {
    automatic = true;
    const value = classify(panelA.input.value, standard);
    moveWindow(value.scale_start === null ? windowStart : BigInt(value.scale_start), true);
  }

  motion.checked = !motionPreference.matches;
  playbackOptions.open = wideLayout.matches;
  wideLayout.addEventListener("change", event => { playbackOptions.open = event.matches; });
  motionPreference.addEventListener("change", event => {
    motion.checked = !event.matches;
    refresh();
  });
  document.querySelectorAll('input[name="standard"]').forEach(radio => {
    radio.addEventListener("change", () => {
      standard = Number(radio.value);
      refresh(true);
    });
  });
  function moveManually(offset) {
    automatic = false;
    const start = windowStart + offset;
    panelA.input.value = `1e${start + BigInt(scale.minOrder)}`;
    moveWindow(start, true);
  }
  find("window-prev").addEventListener("click", () => moveManually(-windowSize));
  find("window-next").addEventListener("click", () => moveManually(windowSize));
  find("window-auto").addEventListener("click", automaticWindow);
  panels.forEach(panel => {
    panel.input.addEventListener("input", () => {
      const value = automatic && panel === panelA ? classify(panel.input.value, standard) : null;
      if (value?.scale_start != null && BigInt(value.scale_start) !== windowStart) {
        moveWindow(BigInt(value.scale_start), false);
      } else {
        render(panel);
        updateControls();
      }
    });
    panel.input.addEventListener("change", () => commitPanel(panel));
  });
  motion.addEventListener("change", () => refresh(motion.checked));
  speed.addEventListener("change", () => refresh(true));
  play.addEventListener("click", () => refresh(true));
  slider.addEventListener("input", setSliderOrder);
  slider.addEventListener("change", () => commitPanel(panelA, true));
  slider.addEventListener("click", () => {
    // Clicking the retained native position may not fire an input event.
    if (!slider.hasAttribute("data-unset")) return;
    setSliderOrder();
    commitPanel(panelA, true);
  });
  slider.addEventListener("keydown", event => {
    if (!slider.hasAttribute("data-unset")) return;
    if (event.key === "Home") slider.value = slider.min;
    else if (event.key === "End") slider.value = slider.max;
    else if (["ArrowRight", "ArrowUp"].includes(event.key)) slider.stepUp();
    else if (["ArrowLeft", "ArrowDown"].includes(event.key)) slider.stepDown();
    else return;
    event.preventDefault();
    setSliderOrder();
    commitPanel(panelA, true);
  });
  addEventListener("stepnov-language", () => {
    numberStatus.textContent = "";
    showWindow();
    refresh(true);
  });
  windowStart = BigInt(classify(panelA.input.value, standard).scale_start ?? "0");
  showWindow();
  refresh(true);
  slider.disabled = false;
})();
