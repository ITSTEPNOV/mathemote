(function (factory) {
  "use strict";
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    globalThis.StepnovMethod = factory();
  }
})(function () {
  "use strict";

  const faces = Object.freeze([
    { id: "F0", en: "Smile", ru: "Улыбка" },
    { id: "F1", en: "Neutral Mouth", ru: "Нейтральный рот" },
    { id: "F3", en: "Downturned Mouth", ru: "Опущенные уголки губ" },
    { id: "F2", en: "Pressed Lips", ru: "Стиснутые губы" },
    { id: "F4", en: "Bared Teeth", ru: "Оскал" }
  ].map(Object.freeze));

  const brows = Object.freeze([
    { id: "B0", en: "Furrowed Brows", ru: "Нахмуренные брови" },
    { id: "B1", en: "Neutral Brows", ru: "Нейтральные брови" },
    { id: "B2", en: "Raised Brows", ru: "Высоко поднятые брови" }
  ].map(Object.freeze));

  const size = faces.length * brows.length;
  const width = BigInt(size);
  const scale = Object.freeze({ minOrder: 0, maxOrder: size - 1, size });
  const decimal = /^([+-]?)(?:([0-9]+)(?:\.([0-9]*))?|\.([0-9]+))(?:[eE]([+-]?[0-9]+))?$/;
  const power = /^([+-]?)\s*(?:([0-9]+)|\(([+-]?[0-9]+)\))\s*\^\s*([+-]?[0-9]+)$/;
  const tower = /^([+-]?)\s*((?:[0-9]+\s*\^\s*){2,}[0-9]+)$/;

  function result(status, inputKind, sign = null, order = null, reason = null) {
    return { status, inputKind, sign, order, reason };
  }

  function classifyOrder(inputKind, sign, order) {
    return result("finite", inputKind, sign, order);
  }

  function automaticStart(order) {
    const remainder = order % width;
    return order - (remainder < 0n ? remainder + width : remainder);
  }

  function boundedPower(digits, exponent) {
    return BigInt(digits.length) * exponent <= 4096n ? BigInt(digits) ** exponent : null;
  }

  function ceilDiv(numerator, denominator) {
    return (numerator + denominator - 1n) / denominator;
  }

  // For 1 <= n/d <= 2, ln(n/d) = 2 * sum(z^(2i+1)/(2i+1)), with 0 <= z <= 1/3.
  // Round all intermediate fixed-point bounds outward, including the geometric tail.
  function logInterval(n, d, unit, terms) {
    const numerator = (n - d) * unit;
    const denominator = n + d;
    let low = numerator / denominator;
    let high = ceilDiv(numerator, denominator);
    const squareLow = low * low / unit;
    const squareHigh = ceilDiv(high * high, unit);
    let sumLow = 0n;
    let sumHigh = 0n;
    let odd = 1n;
    for (let index = 0; index < terms; index += 1) {
      sumLow += 2n * low / odd;
      sumHigh += ceilDiv(2n * high, odd);
      low = low * squareLow / unit;
      high = ceilDiv(high * squareHigh, unit);
      odd += 2n;
    }
    return [sumLow, sumHigh + ceilDiv(3n * high, odd)];
  }

  function certifiedPowerOrder(digits, exponent) {
    const exponentDigits = exponent.toString().length;
    if (digits.length > 4096 || exponentDigits > 256) return null;
    const base = BigInt(digits);
    const binaryOrder = BigInt(base.toString(2).length - 1);
    for (const guard of [16, 32, 64]) {
      const precision = exponentDigits + guard;
      const unit = 10n ** BigInt(precision);
      const terms = 2 * precision;
      const [twoLow, twoHigh] = logInterval(2n, 1n, unit, terms);
      const [fiveFourthsLow, fiveFourthsHigh] = logInterval(10n, 8n, unit, terms);
      const [baseLow, baseHigh] = logInterval(base, 1n << binaryOrder, unit, terms);
      const low = exponent * (binaryOrder * twoLow + baseLow) / (3n * twoHigh + fiveFourthsHigh);
      const high = exponent * (binaryOrder * twoHigh + baseHigh) / (3n * twoLow + fiveFourthsLow);
      if (low === high) return low;
    }
    return null;
  }

  function classifyPower(unary, base, exponent, inputKind = "power") {
    const digits = base.replace(/^[+-]?0*/, "") || "0";
    const negative = (unary === "-") !== (base.startsWith("-") && exponent % 2n !== 0n);
    const sign = negative ? "negative" : "positive";

    if (digits === "0") {
      if (exponent <= 0n) return result("invalid", inputKind, null, null, "undefined_power");
      return result("zero", inputKind, unary === "-" ? "negative" : "zero");
    }
    if (exponent === 0n || digits === "1") return classifyOrder(inputKind, sign, 0n);
    if (/^10*$/.test(digits)) {
      return classifyOrder(inputKind, sign, BigInt(digits.length - 1) * exponent);
    }

    const absoluteExponent = exponent < 0n ? -exponent : exponent;
    const integer = boundedPower(digits, absoluteExponent);
    const integerOrder = integer === null
      ? certifiedPowerOrder(digits, absoluteExponent)
      : BigInt(integer.toString().length - 1);
    if (integerOrder === null) return result("order_unavailable", inputKind, sign, null, "calculation_limit");
    // The integer is not a power of ten. Its reciprocal lies strictly between decades.
    return classifyOrder(inputKind, sign, exponent < 0n ? -integerOrder - 1n : integerOrder);
  }

  function classifyTower(match) {
    const [, unary, chain] = match;
    const terms = chain.split(/\s*\^\s*/).map(term => term.replace(/^0+/, "") || "0");
    const last = terms.pop();
    if (terms.some(term => term === "0" || term === "1")) {
      return result("invalid", "tower", null, null, "unsupported_tower");
    }

    // Evaluate the outer exponent only. The outermost base can often be classified symbolically.
    let exponent = BigInt(last);
    for (let index = terms.length - 1; index > 0; index -= 1) {
      exponent = exponent === 0n ? 1n : boundedPower(terms[index], exponent);
      if (exponent === null) {
        return result("order_unavailable", "tower", unary === "-" ? "negative" : "positive", null, "calculation_limit");
      }
    }
    return classifyPower(unary, terms[0], exponent, "tower");
  }

  function classify(input, standard = 2, windowStart = null) {
    if (standard !== 1 && standard !== 2) throw new RangeError("Standard must be 1 or 2");
    if (windowStart !== null && typeof windowStart !== "bigint"
      && !(typeof windowStart === "string" && /^[+-]?[0-9]+$/.test(windowStart))) {
      throw new TypeError("Window start must be an integer string or bigint");
    }
    const inputType = typeof input;
    const original = inputType === "string" || inputType === "bigint" ? input.toString() : null;
    const parsed = original === null
      ? result("invalid", null, null, null, "input_type")
      : parse(original.trim().replaceAll("−", "-"));
    const { inputKind, sign, order } = parsed;
    const start = order === null ? null : windowStart === null ? automaticStart(order) : BigInt(windowStart);
    const offset = start === null ? null : order - start;
    const outside = offset !== null && (offset < 0n || offset >= width);
    const position = offset === null || outside ? null : Number(offset);
    const faceIndex = position === null ? null : Math.floor(position / brows.length);
    const browIndex = position === null ? null : position % brows.length;
    return Object.freeze({
      original, input_type: original === null ? null : inputType, input_kind: inputKind,
      status: outside ? "out_of_window" : parsed.status, sign, magnitude_order: order?.toString() ?? null,
      scale_start: start?.toString() ?? null, scale_position: position,
      face_index: faceIndex, brow_index: browIndex,
      face_id: faceIndex === null ? (parsed.status === "zero" ? "Z" : null) : faces[faceIndex].id,
      brow_id: browIndex === null ? null : brows[browIndex].id,
      standard, reason: outside ? "outside_window" : parsed.reason
    });
  }

  function parse(value) {
    if (/^[+-]?(?:∞|infinity)$/i.test(value)) {
      return result("infinity", "special", value.startsWith("-") ? "negative" : "positive");
    }
    if (/^nan$/i.test(value)) return result("nan", "special");

    const decimalMatch = decimal.exec(value);
    if (decimalMatch) {
      const [, prefix, whole = "", trailing, leading, exponent] = decimalMatch;
      const digits = whole + (trailing ?? leading ?? "");
      const firstNonzero = digits.search(/[1-9]/);
      const kind = exponent === undefined ? "decimal" : "scientific";
      if (firstNonzero < 0) return result("zero", kind, prefix === "-" ? "negative" : "zero");
      const order = BigInt(exponent ?? "0") + BigInt(whole.length - firstNonzero - 1);
      return classifyOrder(kind, prefix === "-" ? "negative" : "positive", order);
    }
    const powerMatch = power.exec(value);
    if (powerMatch) {
      const [, unary, plain, grouped, exponent] = powerMatch;
      return classifyPower(unary, plain ?? grouped, BigInt(exponent));
    }
    const towerMatch = tower.exec(value);
    if (towerMatch) return classifyTower(towerMatch);
    return result("invalid", null, null, null, value ? "syntax" : "empty");
  }

  const labels = {
    en: {
      negative: "Negative. ", order: "Decimal order", zero: "Zero, round open mouth (:O).",
      infinity: "Infinity (∞).", nan: "NaN. The value is undefined.",
      invalid: "Invalid input.", empty: "Enter a value.", input_type: "Use a string or bigint.",
      undefined_power: "This power is undefined.", unsupported_tower: "Each tower base must be at least 2.",
      outside_window: "Outside the current window.", calculation_limit: "Exact order unavailable within the calculation limit."
    },
    ru: {
      negative: "Отрицательный знак. ", order: "Десятичный порядок", zero: "Ноль, круглый открытый рот (:O).",
      infinity: "Бесконечность (∞).", nan: "NaN. Значение не определено.",
      invalid: "Недопустимый ввод.", empty: "Введите значение.", input_type: "Используйте строку или bigint.",
      undefined_power: "Эта степень не определена.", unsupported_tower: "Каждое основание башни должно быть не меньше 2.",
      outside_window: "Вне текущего окна.", calculation_limit: "Точный порядок недоступен в пределах вычислений."
    }
  };

  function describe(value, language = "en") {
    const locale = language === "ru" ? "ru" : "en";
    const words = labels[locale];
    const sign = value.sign === "negative" ? words.negative : "";
    const order = value.magnitude_order === null ? "" : ` ${words.order} ${value.magnitude_order}.`;
    if (value.status === "finite") {
      return `${sign}${faces[value.face_index][locale]}. ${brows[value.brow_index][locale]}.${order}`;
    }
    return `${sign}${words[value.reason] ?? words[value.status]}${order}`;
  }

  return Object.freeze({ classify, describe, serialize: value => JSON.stringify(value), scale, faces, brows });
});
