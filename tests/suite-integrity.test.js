"use strict";
/* Offline integrity tests for the Vocal Nine suite definition.
 *
 * These tests load the real registry and suite files in a Node vm, the same
 * files the browser loads, and check the registered definition: stage count
 * and order, the control defaults carried in the suite's cards, and the
 * resulting default gain staging. They do not build the Web Audio graph;
 * suite.create is never called here, because it needs a browser
 * AudioContext. Live rendering is a browser check, not an offline one.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const dsp = require("../dsp-math.js");

const root = path.join(__dirname, "..");

function loadSuite() {
  const context = { console };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  for (const file of ["dsp-math.js", "suites.js", "suite-vocal-nine.js"]) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  }
  return context.FIFSuites;
}

function sliderDefaults(cardsHTML) {
  const sliders = {};
  const re = /<input type="range" id="([A-Za-z0-9]+)" min="(-?[\d.]+)" max="(-?[\d.]+)" step="([\d.]+)" value="(-?[\d.]+)">/g;
  let m;
  while ((m = re.exec(cardsHTML)) !== null) {
    sliders[m[1]] = { min: Number(m[2]), max: Number(m[3]), step: Number(m[4]), value: Number(m[5]) };
  }
  return sliders;
}

test("registry holds exactly one suite and it is Vocal Nine", () => {
  const suites = loadSuite();
  const list = suites.list();
  assert.equal(list.length, 1);
  assert.equal(list[0].id, "vocal-nine");
  assert.equal(list[0].name, "Vocal Nine");
  assert.equal(list[0].patents, "PATENTS.md");
  assert.equal(typeof list[0].create, "function");
  assert.equal(suites.get("vocal-nine"), list[0]);
  assert.equal(suites.get("no-such-suite"), null);
});

test("Vocal Nine has nine stages in the documented order", () => {
  const suite = loadSuite().get("vocal-nine");
  assert.equal(suite.stages.length, 9);
  const expectedOrder = [
    "Analyze",
    "Expander",
    "Feedback Killer",
    "Cleanup",
    "Mic Fix",
    "De-esser",
    "Exciter",
    "Dynamics",
    "Studio Cleanup",
  ];
  expectedOrder.forEach((name, i) => {
    assert.ok(suite.stages[i].startsWith(name), `stage ${i + 1} should be ${name}, got: ${suite.stages[i]}`);
  });
});

test("every control default sits inside its own slider range", () => {
  const suite = loadSuite().get("vocal-nine");
  const sliders = sliderDefaults(suite.cardsHTML);
  const ids = Object.keys(sliders);
  assert.ok(ids.length >= 25, `expected at least 25 sliders, found ${ids.length}`);
  for (const id of ids) {
    const s = sliders[id];
    assert.ok(s.value >= s.min && s.value <= s.max, `${id} default ${s.value} outside [${s.min}, ${s.max}]`);
  }
});

test("documented stage parameters match the control defaults", () => {
  const suite = loadSuite().get("vocal-nine");
  const s = sliderDefaults(suite.cardsHTML);
  // Cleanup: high-pass default 80 Hz, inside the documented 40 to 220 Hz span.
  assert.equal(s.hpfF.value, 80);
  // Expander: threshold and ratio defaults.
  assert.equal(s.gateT.value, -40);
  assert.equal(s.gateR.value, 2);
  // De-esser: split at 6.8 kHz, as documented.
  assert.equal(s.deEssF.value, 6800);
  assert.equal(s.deEssT.value, -27);
  // Dynamics: compressor defaults and the limiter ceiling.
  assert.equal(s.compT.value, -18);
  assert.equal(s.compR.value, 2);
  assert.equal(s.limC.value, -1);
  // Mic Fix amount default.
  assert.equal(s.micAmt.value, 70);
  // Exciter amount default.
  assert.equal(s.excAmt.value, 10);
  // Flat corrective EQ at rest: every EQ gain defaults to 0 dB.
  for (const id of ["eqLowG", "eqM1G", "eqM2G", "eqHG"]) assert.equal(s[id].value, 0, id);
  // Trim and output at unity by default.
  assert.equal(s.inGain.value, 0);
  assert.equal(s.outGain.value, 0);
});

test("default gain staging sums within a sane bound", () => {
  const suite = loadSuite().get("vocal-nine");
  const s = sliderDefaults(suite.cardsHTML);
  const mic = dsp.micFixGains(s.micAmt.value);
  const positiveDb =
    Math.max(0, mic.bodyDb) +
    Math.max(0, s.eqLowG.value) +
    Math.max(0, s.eqM1G.value) +
    Math.max(0, s.eqM2G.value) +
    Math.max(0, s.eqHG.value) +
    Math.max(0, s.inGain.value) +
    Math.max(0, s.outGain.value);
  // The only positive gain at rest is the Mic Fix body lift. Total positive
  // staging stays well under the limiter ceiling's ability to absorb it.
  assert.ok(positiveDb > 0, "Mic Fix body lift is present at the default amount");
  assert.ok(positiveDb <= 6, `positive gain staging at rest is ${positiveDb} dB, bound is 6 dB`);
  // Net Mic Fix contribution is a cut, not a lift: the chain starts tame.
  assert.ok(mic.cutDb + mic.bodyDb < 0);
  // Even in the worst slider case the final ceiling is a fixed bound:
  // the limiter ceiling slider never goes above 0 dB.
  assert.ok(s.limC.max <= 0);
});

test("the suite ships the tested math, not a private copy of it", () => {
  const src = fs.readFileSync(path.join(root, "suite-vocal-nine.js"), "utf8");
  assert.ok(src.includes("FIFDspMath.buildSatCurve"), "saturation curve delegates to dsp-math.js");
  assert.ok(src.includes("FIFDspMath.buildExciterCurve"), "exciter curve delegates to dsp-math.js");
  assert.ok(src.includes("FIFDspMath.expanderTargetDb"), "expander law delegates to dsp-math.js");
  assert.ok(src.includes("FIFDspMath.micFixGains"), "Mic Fix gains delegate to dsp-math.js");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.ok(html.indexOf("dsp-math.js") < html.indexOf("suite-vocal-nine.js"),
    "index.html loads dsp-math.js before the suite");
});

test("index.html loads the registry and the suite in order", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const suitesAt = html.indexOf("suites.js");
  const vocalAt = html.indexOf("suite-vocal-nine.js");
  const appAt = html.indexOf("app.js");
  assert.ok(suitesAt !== -1 && vocalAt !== -1 && appAt !== -1);
  assert.ok(suitesAt < vocalAt && vocalAt < appAt);
});
