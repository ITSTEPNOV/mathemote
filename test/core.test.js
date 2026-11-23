"use strict";

const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");
const { classify, describe, serialize, scale, faces, brows } = require("..");

function checkOrder(input, expected) {
  const result = classify(input);
  assert.equal(result.magnitude_order, String(expected), String(input));
  const order = BigInt(expected);
  const window = 15n;
  const start = (order < 0n ? -((-order + window - 1n) / window) : order / window) * window;
  const position = Number(order - start);
  assert.equal(result.status, "finite");
  assert.equal(result.scale_start, String(start));
  assert.equal(result.scale_position, position);
  assert.equal(result.face_index * 3 + result.brow_index, position);
  assert.equal(result.face_id, faces[Math.floor(position / 3)].id);
  assert.equal(result.brow_id, brows[position % 3].id);
}

test("every decade boundary from -32 through 40, on each side and with both signs", () => {
  for (let exponent = -32; exponent <= 40; exponent += 1) {
    for (const sign of ["", "-", "−"]) {
      checkOrder(`${sign}9.999999999999999999999999999999999999e${exponent - 1}`, exponent - 1);
      checkOrder(`${sign}1e${exponent}`, exponent);
      checkOrder(`${sign}1.000000000000000000000000000000000001e${exponent}`, exponent);
    }
  }
});

test("all visual transitions and group rollovers", () => {
  for (let order = scale.minOrder; order < scale.maxOrder; order += 1) {
    const before = classify(10n ** BigInt(order));
    const after = classify(10n ** BigInt(order + 1));
    assert.equal(after.face_index - before.face_index, before.brow_index === 2 ? 1 : 0);
    assert.equal(after.brow_index, (before.brow_index + 1) % 3);
  }
  assert.equal(classify(10n ** 15n - 1n).face_id, "F4");
  assert.equal(classify(10n ** 15n).face_id, "F0");
  assert.equal(classify("9.99e8").face_id, "F3");
  assert.equal(classify("1e9").face_id, "F2");
  assert.equal(classify("9.99e11").face_id, "F2");
  assert.equal(classify("1e12").face_id, "F4");
});

test("negative floor, aligned windows, and fixed-window classification", () => {
  const boundaries = [
    [-16, -30, 14], [-15, -15, 0], [-1, -15, 14], [0, 0, 0], [14, 0, 14],
    [15, 15, 0], [29, 15, 14], [30, 30, 0], [100, 90, 10], [1007, 1005, 2], [1000, 990, 10]
  ];
  for (const [order, start, position] of boundaries) {
    const input = ` 1e${order} `;
    const auto = classify(input);
    const manual = classify(input, 2, String(start));
    assert.equal(auto.scale_start, String(start));
    assert.equal(auto.scale_position, position);
    assert.deepEqual(manual, auto);
    for (const otherStart of [BigInt(start) - 15n, BigInt(start) + 15n]) {
      const outside = classify(input, 2, otherStart);
      assert.equal(outside.status, "out_of_window");
      assert.equal(outside.original, input);
      assert.equal(outside.magnitude_order, String(order));
      assert.equal(outside.scale_start, String(otherStart));
      assert.equal(outside.scale_position, null);
      assert.equal(outside.face_id, null);
      assert.equal(outside.brow_id, null);
    }
  }
  assert.equal(classify("1e100", 1, "88").scale_position, 12);
  assert.throws(() => classify("1", 2, 0), TypeError);
});

test("decimal digit counting, leading and trailing zeroes, both sides of unity", () => {
  checkOrder("  \t+0001.000  ", 0);
  checkOrder("0000.9999999999999999999999999999999", -1);
  checkOrder(".00010", -4);
  checkOrder("00010.", 1);
  checkOrder(`0.${"0".repeat(18000)}1`, -18001);
  checkOrder("000.00200E+010", 7);
  checkOrder("-0000001000", 3);
  assert.equal(classify("-0000001000").sign, "negative");
});

test("large integers, scientific coefficients and exponents stay exact", () => {
  const exponent = 10n ** 120n;
  checkOrder(`99.1e+${exponent}`, exponent + 1n);
  checkOrder(`.01e-${exponent}`, -exponent - 2n);
  checkOrder(10n ** 10000n - 1n, 9999);
  checkOrder(10n ** 10000n, 10000);
  checkOrder("8".repeat(100000), 99999);
  const original = "   −000.00200E+010  ";
  assert.equal(classify(original).original, original);
});

test("integer powers and reciprocals agree with an independent exact integer oracle", () => {
  for (let base = 2n; base <= 120n; base += 1n) {
    for (let exponent = 1n; exponent <= 18n; exponent += 1n) {
      const integer = base ** exponent;
      let limit = 1n;
      let order = 0;
      while (limit * 10n <= integer) {
        order += 1;
        limit *= 10n;
      }
      checkOrder(`${base}^${exponent}`, order);
      checkOrder(`${base}^-${exponent}`, integer === limit ? -order : -order - 1);
      assert.equal(classify(`(-${base})^${exponent}`).sign, exponent % 2n === 0n ? "positive" : "negative");
    }
  }
  checkOrder("1000^-41", -123);
  checkOrder("100^12345678901234567890", 24691357802469135780n);
  checkOrder("2^4096", 1233);
  assert.equal(classify("-2^2").sign, "negative");
  assert.equal(classify("(-2)^-3").sign, "negative");
  checkOrder("2^4097", 1233);
  checkOrder("2^-4097", -1234);
  const overBudget = `2^${"9".repeat(257)}`;
  assert.equal(classify(overBudget).reason, "calculation_limit");
  assert.equal(classify(overBudget).magnitude_order, null);
});

test("certified power orders match exact integers around the expansion limit and decade boundaries", () => {
  checkOrder("2^10000", 3010);
  checkOrder("3^100000", 47712);
  checkOrder("10^1000000", 1000000);
  for (const base of [2n, 3n, 7n, 9n, 11n, 99n, 999n, 1001n]) {
    for (const exponent of [1500n, 2048n, 4097n, 6654n, 10000n]) {
      const order = (base ** exponent).toString().length - 1;
      checkOrder(`${base}^${exponent}`, order);
      checkOrder(`${base}^-${exponent}`, -order - 1);
    }
  }
  for (const length of [10, 40]) {
    const powerOfTen = 10n ** BigInt(length);
    checkOrder(`${powerOfTen - 1n}^5000`, BigInt(length * 5000 - 1));
    checkOrder(`${powerOfTen + 1n}^5000`, BigInt(length * 5000));
  }
  const boundary = 10n ** 1000n;
  for (const base of [boundary - 1n, boundary + 1n]) {
    assert.equal(classify(`${base}^5000`).status, "order_unavailable");
  }
});
test("right-associated towers use exact outer exponents within the calculation limit", () => {
  checkOrder("2^2^3", 2);
  checkOrder("10 ^ 03 ^ 2", 9);
  checkOrder("10^2^4^0", 2);
  checkOrder("10^2^0", 1);
  checkOrder("10^2^5", 32);
  checkOrder("10^2^6", 64n);
  checkOrder("10^10^100", 10n ** 100n);
  assert.equal(classify("10^10^10^100").status, "order_unavailable");
  const input = "−10^10^1000000000000000000000000000000000";
  const value = classify(input);
  assert.equal(value.status, "order_unavailable");
  assert.equal(value.reason, "calculation_limit");
  assert.equal(value.magnitude_order, null);
  assert.equal(value.scale_start, null);
  assert.equal(value.original, input);
  assert.equal(value.sign, "negative");
  assert.equal(classify("10^0^0").reason, "unsupported_tower");
});

test("zero, infinity, NaN, undefined powers and invalid input", () => {
  for (const input of ["0", "+0.0", "-0e999", "−.0", 0n, "0^66", "-0^2"]) {
    const value = classify(input);
    assert.equal(value.status, "zero");
    assert.equal(value.face_id, "Z");
    assert.equal(value.brow_id, null);
    assert.equal(value.magnitude_order, null);
    assert.equal(value.scale_start, null);
    assert.equal(classify(input, 2, "-1000").scale_start, null);
  }
  assert.equal(classify("-0").sign, "negative");
  assert.equal(classify("-0^2").sign, "negative");
  assert.equal(classify("(-0)^3").sign, "zero");
  for (const input of ["+∞", "∞", "−∞", "Infinity", " -INFINITY "]) {
    assert.equal(classify(input).status, "infinity");
    assert.equal(classify(input).face_id, null);
  }
  assert.equal(classify("−∞").sign, "negative");
  assert.equal(classify("NaN").status, "nan");
  assert.equal(classify("NaN").face_id, null);
  for (const input of ["NaN", "∞", "?", "10^10^10^100"]) assert.equal(classify(input).scale_position, null);
  for (const input of ["0^0", "0^-1"]) assert.equal(classify(input).reason, "undefined_power");
  for (const input of ["", "1e", "+.", "1,2", "1 000", "0xF", "1_000", "2^", "2^1.5", "<svg>", null, 100, NaN, Infinity, {}]) {
    assert.equal(classify(input).status, "invalid");
  }
});

test("protocols share the entire payload except standard and serialize deterministically", () => {
  const inputs = Array.from({ length: 15 }, (_, index) => `-1e${index}`);
  inputs.push("NaN", "−∞", "-0.0", "0.001", "10^14", "10^10^100", 9999999999n, "?", null);
  for (const input of inputs) {
    const first = classify(input, 1);
    const simultaneous = classify(input, 2);
    assert.deepEqual({ ...first, standard: 2 }, simultaneous);
    assert.equal(serialize(first), serialize(classify(input, 1)));
    assert.deepEqual(JSON.parse(serialize(first)), first);
    assert.equal(describe(first), describe(simultaneous));
  }
  const huge = "1e99999999999999999999";
  const first = classify(huge, 1, "99999999999999999990");
  assert.deepEqual({ ...first, standard: 2 }, classify(huge, 2, "99999999999999999990"));
  assert.match(describe(classify("-1e11")), /Negative.*Pressed Lips.*Raised Brows.*11/);
  assert.match(describe(classify("1e10"), "ru"), /Стиснутые губы/);
  assert.match(describe(classify(".002", 2, "0"), "ru"), /Вне текущего окна.*-3/);
  assert.throws(() => classify("1", 3), RangeError);
});

test("the five faces, three eyebrow positions, and zero SVG retain their original drawings", () => {
  const context = vm.createContext({});
  vm.runInContext(readFileSync(resolve(__dirname, "..", "src", "faces.js"), "utf8").replace(/\r\n/g, "\n"), context);
  const { draw } = context.StepnovFaces;
  const images = faces.flatMap(face => brows.map(brow => draw(face.id, brow.id)));
  images.push(draw("Z"));
  assert.equal(createHash("sha256").update(images.join("")).digest("hex"),
    "67754daa86641b992845754679367640982760c9344f173a3b0311d82f0f14f0");
});

test("standalone browser script and Node entry agree without document, timers or network", () => {
  const context = vm.createContext({});
  const path = resolve(__dirname, "..", "src", "core.js");
  vm.runInContext(readFileSync(path, "utf8"), context);
  const browser = context.StepnovMethod;
  assert.equal(browser.serialize(browser.classify("1e9")), serialize(classify("1e9")));
  assert.equal(browser.describe(browser.classify("NaN")), describe(classify("NaN")));
});
