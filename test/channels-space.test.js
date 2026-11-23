"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { classify, describe, faces, brows } = require("..");
const { text, speakLocal } = require("../src/channels");
const { calculate } = require("../examples/space-model");
const { languages, keys, translate, resolve } = require("../src/locales");

test("all ten locales have complete strings, matching placeholders and an English fallback", () => {
  assert.deepEqual(Object.keys(languages), ["en", "ru", "es", "fr", "de", "pt-BR", "zh-CN", "ja", "ar", "hi"]);
  for (const key of keys()) {
    const parameters = value => (value.match(/\{\w+\}/g) ?? []).sort();
    const english = translate("en", key);
    for (const language of Object.keys(languages)) {
      const localized = translate(language, key);
      assert.notEqual(localized, "");
      assert.deepEqual(parameters(localized), parameters(english), `${language}/${key}`);
    }
    assert.equal(translate("unknown", key), english);
  }
  assert.equal(resolve(["pt-PT", "en"]), "pt-BR");
  assert.equal(resolve(["zh-Hans-CN", "en"]), "zh-CN");
  assert.equal(resolve(["nl-BE"]), "en");
});

test("text and speech describe one exact classification, with both levels of detail", () => {
  const source = " −1e1000 ";
  const value = classify(source, 1);
  const short = text(value);
  const detailed = text(value, true);
  assert.match(short, /Минус.*Порядок 1000.*Смещение окна 990.*Гримаса 4.*Стиснутые губы.*Нейтральные брови/);
  assert.ok(detailed.includes(source));
  assert.match(detailed, /Позиция 10.*пять секунд/);
  assert.match(text(classify("1e-16")), /Плюс.*Порядок -16.*Смещение окна -30.*Гримаса 5/);
  for (const [input, expected] of [["0", /Ноль/], ["-∞", /Минус.*Бесконечность/], ["NaN", /NaN/]]) {
    const message = text(classify(input), true);
    assert.match(message, expected);
    assert.doesNotMatch(message, /Смещение окна|Гримаса [0-9]/);
  }
  assert.match(text(classify("1e1000", 2, "0")), /Порядок 1000.*Смещение окна 0.*Вне текущего окна/);
  assert.match(text(classify("1e-99999999999999999999")), /-99999999999999999999/);
});

test("both languages and both speech lengths use the approved names across windows", () => {
  const approvedFaces = [
    ["F0", "Улыбка", "Smile"],
    ["F1", "Нейтральный рот", "Neutral Mouth"],
    ["F3", "Опущенные уголки губ", "Downturned Mouth"],
    ["F2", "Стиснутые губы", "Pressed Lips"],
    ["F4", "Оскал", "Bared Teeth"]
  ];
  const approvedBrows = [
    ["B0", "Нахмуренные брови", "Furrowed Brows"],
    ["B1", "Нейтральные брови", "Neutral Brows"],
    ["B2", "Высоко поднятые брови", "Raised Brows"]
  ];
  assert.deepEqual(faces.map(({ id, ru, en }) => [id, ru, en]), approvedFaces);
  assert.deepEqual(brows.map(({ id, ru, en }) => [id, ru, en]), approvedBrows);
  for (const start of [-30n, 0n, 990n]) {
    for (const [faceIndex, [faceId, faceRu, faceEn]] of approvedFaces.entries()) {
      for (const [browIndex, [browId, browRu, browEn]] of approvedBrows.entries()) {
        const exponent = start + BigInt(faceIndex * 3 + browIndex);
        for (const standard of [1, 2]) {
          const value = classify(`1e${exponent}`, standard, start);
          assert.equal(value.face_id, faceId);
          assert.equal(value.brow_id, browId);
          assert.ok(describe(value, "ru").includes(`${faceRu}. ${browRu}.`));
          assert.ok(describe(value, "en").includes(`${faceEn}. ${browEn}.`));
          assert.ok(text(value).includes(`${faceRu}. ${browRu}.`));
          assert.ok(text(value, true).includes(`${faceRu}. ${browRu}.`));
        }
      }
    }
  }
});

test("speech chooses an installed local Russian voice and never falls back to a remote voice", () => {
  const remote = { lang: "ru-RU", localService: false };
  const english = { lang: "en-US", localService: true };
  const local = { lang: "ru-RU", localService: true };
  const played = [];
  let canceled = 0;
  let failures = 0;
  const host = {
    speechSynthesis: {
      getVoices: () => [remote, english, local],
      pending: true,
      cancel: () => { canceled += 1; },
      speak: utterance => played.push(utterance)
    },
    SpeechSynthesisUtterance: class { constructor(message) { this.text = message; } }
  };
  const message = text(classify("1e1000"));
  assert.equal(speakLocal(message, host, () => { failures += 1; }), true);
  assert.equal(canceled, 1);
  assert.equal(played[0].voice, local);
  assert.equal(played[0].text, message);
  played[0].onerror({ error: "canceled" });
  played[0].onerror({ error: "synthesis-failed" });
  assert.equal(failures, 1);
  host.speechSynthesis.getVoices = () => [remote, english];
  assert.equal(speakLocal(message, host, assert.fail), false);
  assert.equal(speakLocal(message, {}, assert.fail), false);
  assert.equal(played.length, 1);
  host.speechSynthesis.getVoices = () => [
    { lang: "es-ES", localService: true },
    { lang: "es-MX", localService: false },
    { lang: "es-MX", localService: true }
  ];
  assert.equal(speakLocal(text(classify("1e1000"), false, "es"), host, assert.fail, "es-MX"), true);
  assert.equal(played.at(-1).voice.lang, "es-MX");
  assert.match(played.at(-1).text, /Orden 1000.*Labios apretados/);
  assert.equal(speakLocal(message, host, assert.fail, "de"), false);
});

test("long speech queues all text in bounded utterances and prefers a known local female voice", () => {
  const female = { name: "Microsoft Zira", lang: "en-US", localService: true };
  const male = { name: "Microsoft David", lang: "en-US", localService: true };
  const played = [];
  const host = {
    speechSynthesis: {
      getVoices: () => [male, female],
      cancel: () => { played.length = 0; },
      speak: utterance => played.push(utterance)
    },
    SpeechSynthesisUtterance: class { constructor(message) { this.text = message; } }
  };
  const message = `Original value: 1e${"9".repeat(300)}. Decimal order. Raised Brows.`;
  assert.equal(speakLocal(message, host, assert.fail, "en"), true);
  assert.ok(played.length > 1);
  assert.ok(played.every(part => part.voice === female && part.text.length <= 120));
  assert.equal(played.map(part => part.text).join(""), message);
});

test("the constant-speed model and Mission ratio are exact across every available setting", () => {
  function fraction(decimal) {
    const [integer, decimalDigits = ""] = decimal.split(".");
    return [BigInt(integer + decimalDigits), 10n ** BigInt(decimalDigits.length)];
  }
  for (const destination of ["moon", "mars", "proxima"]) {
    for (const speed of ["0", "1", "2", "3"]) {
      for (const limit of ["4", "5", "7"]) {
        const route = calculate(destination, speed, limit);
        const distance = BigInt(route.distance.original);
        const rate = BigInt(route.speed.original);
        const timeLimit = BigInt(route.limit);
        const [time, timeDivisor] = fraction(route.travel.original);
        const [ratio, ratioDivisor] = fraction(route.ratio.original);
        assert.equal(time * rate, distance * timeDivisor);
        assert.equal(ratio * rate * timeLimit, distance * ratioDivisor);
        assert.equal(route.deadline, distance - rate * timeLimit);
        for (const value of [route.distance, route.speed, route.travel, route.ratio]) {
          assert.deepEqual(value, classify(value.original), "every metric uses the shared classifier");
        }
      }
    }
  }
  const moon = calculate("moon", "1", "5");
  assert.equal(moon.travel.original, "38440");
  assert.equal(moon.ratio.original, "0.3844");
  assert.equal(moon.ratio.magnitude_order, "-1");
  assert.throws(() => calculate("moon", "9", "5"), RangeError);
});
