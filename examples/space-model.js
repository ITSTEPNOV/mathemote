(function (factory) {
  "use strict";
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("../src/core.js"));
  } else {
    globalThis.StepnovSpace = factory(globalThis.StepnovMethod);
  }
})(function (core) {
  "use strict";
  const { classify } = core;

  const distances = new Map([
    ["moon", "384400"],
    ["mars", "78000000"],
    ["proxima", "40100000000000"]
  ]);
  const speedOrders = new Set(["0", "1", "2", "3"]);
  const timeOrders = new Set(["4", "5", "7"]);

  function decimalPoint(digits, places) {
    if (!places) return digits;
    const padded = digits.padStart(places + 1, "0");
    const fraction = padded.slice(-places).replace(/0+$/, "");
    return padded.slice(0, -places) + (fraction ? `.${fraction}` : "");
  }

  function calculate(destination, speedOrder, limitOrder) {
    const distance = distances.get(destination);
    if (!distance || !speedOrders.has(speedOrder) || !timeOrders.has(limitOrder)) {
      throw new RangeError("Choose a demonstration destination, speed and time limit");
    }
    const speed = "1" + "0".repeat(Number(speedOrder));
    const limit = "1" + "0".repeat(Number(limitOrder));
    const travel = decimalPoint(distance, Number(speedOrder));
    const ratio = decimalPoint(distance, Number(speedOrder) + Number(limitOrder));
    return {
      distance: classify(distance), speed: classify(speed), travel: classify(travel),
      limit, ratio: classify(ratio),
      deadline: BigInt(distance) - BigInt(speed) * BigInt(limit)
    };
  }

  return Object.freeze({ calculate });
});
