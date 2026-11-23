(() => {
  "use strict";

  const { scale } = StepnovMethod;
  const { t, describe, unitNumber } = StepnovUI;
  const { draw } = StepnovFaces;
  const find = id => document.getElementById(id);
  const destination = find("destination");
  const speed = find("ship-speed");
  const limit = find("mission-limit");
  const magnitude = find("magnitude");
  const mission = find("mission");
  const status = find("route-status");
  const fields = [
    { id: "distance", unit: "km" },
    { id: "speed", unit: "kms" },
    { id: "travel", unit: "seconds" }
  ];
  const ratio = { id: "ratio" };
  let options = [];
  const refreshChannels = StepnovChannels.mount(find("number-access"), () => options);

  function metric(field, result) {
    const card = document.createElement("article");
    card.className = "card metric";
    card.dataset.metric = field.id;
    card.innerHTML = '<h3></h3><p class="metric-value"></p><p class="metric-window"></p>'
      + '<div class="stage" aria-hidden="true"><div class="picture"></div></div><p class="readout"></p>';
    card.querySelector("h3").textContent = t(field.id);
    card.querySelector(".metric-value").textContent = unitNumber(result.original)
      + (field.unit ? ` ${t(field.unit)}` : "");
    const window = document.createElement("bdi");
    window.dir = "ltr";
    window.textContent = `10^${result.scale_start} … 10^${BigInt(result.scale_start) + BigInt(scale.maxOrder)}`;
    card.querySelector(".metric-window").append(t("window") + " ", window);
    card.querySelector(".picture").innerHTML = draw(result.face_id, result.brow_id);
    card.querySelector(".readout").textContent = describe(result);
    return card;
  }

  function render(announce = false) {
    const contextual = document.querySelector('input[name="navigation-mode"]:checked').value === "mission";
    const route = StepnovSpace.calculate(destination.value, speed.value, limit.value);
    magnitude.hidden = contextual;
    mission.hidden = !contextual;
    if (contextual) {
      const verdict = t(route.deadline > 0n ? "over" : route.deadline < 0n ? "within" : "equal");
      const durations = `${t("travel")}: ${unitNumber(route.travel.original)} ${t("seconds")}. ${t("limit")}: ${unitNumber(route.limit)} ${t("seconds")}.`;
      const result = document.createElement("strong");
      result.textContent = `${verdict}.`;
      find("mission-times").replaceChildren(`${durations} `, result);
      const times = `${durations} ${verdict}.`;
      find("mission-metric").replaceChildren(metric(ratio, route.ratio));
      options = [{ id: ratio.id, label: t(ratio.id), context: times, result: route.ratio }];
      if (announce) status.textContent = `${t("missionMode")}. ${times}`;
    } else {
      find("absolute-metrics").replaceChildren(...fields.map(field => metric(field, route[field.id])));
      options = fields.map(field => ({ id: field.id, label: `${t(field.id)}, ${t(field.unit)}`, result: route[field.id] }));
      if (announce) status.textContent = `${t("magnitudeMode")}. ${t("travel")} ${unitNumber(route.travel.original)} ${t("seconds")}.`;
    }
    refreshChannels();
  }

  [destination, speed, limit, ...document.querySelectorAll('input[name="navigation-mode"]')].forEach(control => {
    control.addEventListener("change", () => render(true));
  });
  addEventListener("stepnov-language", () => {
    status.textContent = "";
    render();
  });
  render();
})();
