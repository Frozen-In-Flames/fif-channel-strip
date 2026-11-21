"use strict";
/* Offline tests for the Vocal Nine chain's pure DSP math (dsp-math.js).
 *
 * Coverage boundary, stated plainly: these tests cover the offline math and
 * the gain staging arithmetic. They do not render the live chain. Biquad
 * filtering, browser dynamics nodes, the worklet stages, and metering need
 * a real AudioContext in a browser and are not claimed here.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const dsp = require("../dsp-math.js");

function sineBurst({ freq = 440, sampleRate = 48000, seconds = 0.1, amplitude = 0.5 } = {}) {
  const n = Math.floor(sampleRate * seconds);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amplitude * Math.sin((2 * Math.PI * freq * i) / sampleRate);
  return out;
}
function rms(buf) {
  let sum = 0;
  for (const s of buf) sum += s * s;
  return Math.sqrt(sum / buf.length);
}
function peak(buf) {
  let p = 0;
  for (const s of buf) p = Math.max(p, Math.abs(s));
  return p;
}
function mapBuf(buf, fn) {
  const out = new Float32Array(buf.length);
  for (let i = 0; i < buf.length; i++) out[i] = fn(buf[i]);
  return out;
}

test("dbToGain and gainToDb round trip at reference levels", () => {
  assert.equal(dsp.dbToGain(0), 1);
  assert.ok(Math.abs(dsp.dbToGain(20) - 10) < 1e-12);
  assert.ok(Math.abs(dsp.dbToGain(-6) - 0.5011872336272722) < 1e-12);
  assert.ok(Math.abs(dsp.gainToDb(dsp.dbToGain(-18)) - -18) < 1e-9);
  assert.equal(dsp.gainToDb(0), -Infinity);
});

test("saturation curve is bounded, monotonic, and normalised at full scale", () => {
  for (const drive of [0, 25, 50, 65, 100]) {
    const curve = dsp.buildSatCurve(drive, 1024);
    assert.equal(curve.length, 1024);
    assert.ok(Math.abs(curve[0] - -1) < 1e-6, `drive ${drive} low end`);
    assert.ok(Math.abs(curve[1023] - 1) < 1e-6, `drive ${drive} high end`);
    for (let i = 0; i < curve.length; i++) {
      assert.ok(curve[i] >= -1 && curve[i] <= 1, `drive ${drive} index ${i} out of range`);
      if (i > 0) assert.ok(curve[i] >= curve[i - 1], `drive ${drive} not monotonic at ${i}`);
    }
  }
  // Higher drive reaches the flat part of the tanh sooner.
  assert.ok(dsp.satCurveValue(0.25, 100) > dsp.satCurveValue(0.25, 0));
  assert.equal(dsp.satCurveValue(0, 50), 0);
});

test("exciter curve is asymmetric, which is where its even harmonics come from", () => {
  const curve = dsp.buildExciterCurve(1024);
  assert.ok(Math.abs(curve[0] - -1) < 1e-6);
  assert.ok(Math.abs(curve[1023] - 1) < 1e-6);
  const pos = dsp.exciterCurveValue(0.5);
  const neg = dsp.exciterCurveValue(-0.5);
  assert.ok(pos > 0 && neg < 0);
  assert.notEqual(Math.abs(pos), Math.abs(neg));
  assert.equal(dsp.exciterCurveValue(0), 0);
});

test("expander gain law: unity at threshold, ratio scaled reduction below it", () => {
  assert.equal(dsp.expanderTargetDb(-40, -40, 2), 0);
  assert.equal(dsp.expanderTargetDb(-20, -40, 2), 0);
  // 10 dB under threshold at ratio 2 gives 5 dB of reduction.
  assert.equal(dsp.expanderTargetDb(-50, -40, 2), -5);
  // 10 dB under threshold at ratio 10 gives 9 dB of reduction.
  assert.ok(Math.abs(dsp.expanderTargetDb(-50, -40, 10) - -9) < 1e-12);
  // Ratio 1 is no expansion at all.
  assert.equal(dsp.expanderTargetDb(-70, -40, 1), 0);
});

test("expander envelope moves toward its target without overshoot", () => {
  let env = 0;
  for (let i = 0; i < 600; i++) env = dsp.expanderEnvelopeStep(env, -12, 1 / 60);
  assert.ok(env < 0 && env > -12, "envelope approaches from above and never overshoots");
  assert.ok(Math.abs(env - -12) < 0.01, "envelope settles on the target");
  const oneStep = dsp.expanderEnvelopeStep(0, -12, 1 / 60);
  assert.ok(oneStep < 0 && oneStep > -2, "a single frame moves only part of the way, so gain never steps");
});

test("Mic Fix gains scale cut and body together with the amount", () => {
  assert.deepEqual(dsp.micFixGains(0), { cutDb: 0, bodyDb: 0 });
  assert.deepEqual(dsp.micFixGains(100), { cutDb: -6, bodyDb: 3 });
  const at70 = dsp.micFixGains(70);
  assert.ok(Math.abs(at70.cutDb - -4.2) < 1e-12);
  assert.ok(Math.abs(at70.bodyDb - 2.1) < 1e-12);
});

test("fixture: sine burst through saturation and the limiter ceiling stays non-silent and does not clip", () => {
  const input = sineBurst({});
  const satCurve = dsp.buildSatCurve(50, 1024);
  const shaped = mapBuf(input, (x) => dsp.applyCurve(satCurve, x));
  const limited = mapBuf(shaped, (x) => dsp.clampToCeiling(x, -1));
  assert.ok(rms(limited) > 0.1, "output is not silent");
  assert.ok(peak(limited) <= dsp.dbToGain(-1) + 1e-12, "output stays at or under the -1 dB ceiling");
  assert.ok(peak(limited) > 0.5, "saturation adds body instead of only attenuating");
});

test("fixture: impulse through the exciter curve produces a bounded non-zero response", () => {
  const impulse = new Float32Array(256);
  impulse[0] = 0.9;
  const curve = dsp.buildExciterCurve(1024);
  const out = mapBuf(impulse, (x) => dsp.applyCurve(curve, x));
  assert.ok(Math.abs(out[0]) > 0.5, "impulse passes through the exciter curve");
  assert.ok(peak(out) <= 1, "exciter output stays within full scale");
  // Zero input maps through the 1024 point curve table, whose centre falls
  // between two entries, so the table response to silence is near zero
  // rather than bit exact. The point functions themselves are exact at 0,
  // which the negative control below checks separately.
  for (let i = 1; i < out.length; i++) assert.ok(Math.abs(out[i]) < 0.001, `sample ${i} should be near zero`);
});

test("negative control: silence through saturation, exciter, and ceiling stays silent", () => {
  const silence = new Float32Array(1024);
  // The point functions are exact at zero: silence in, silence out.
  const exact = mapBuf(silence, (x) => dsp.clampToCeiling(dsp.satCurveValue(x, 100), -1));
  assert.equal(rms(exact), 0);
  assert.equal(dsp.exciterCurveValue(0), 0);
  // Through the 1024 point curve tables, silence stays below -60 dB, the
  // table quantisation floor described in the impulse test above.
  const satCurve = dsp.buildSatCurve(100, 1024);
  const excCurve = dsp.buildExciterCurve(1024);
  const a = mapBuf(silence, (x) => dsp.clampToCeiling(dsp.applyCurve(satCurve, x), -1));
  const b = mapBuf(silence, (x) => dsp.applyCurve(excCurve, x));
  assert.ok(rms(a) < 0.001, `table saturation response to silence is ${rms(a)}`);
  assert.ok(rms(b) < 0.001, `table exciter response to silence is ${rms(b)}`);
});
