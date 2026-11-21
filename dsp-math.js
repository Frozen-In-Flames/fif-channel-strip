/* FIF DSP math: the pure, node-free calculations behind the Vocal Nine chain.
 *
 * These functions were extracted from suite-vocal-nine.js so the chain's
 * parameter and gain-curve math can be tested offline in Node, without a
 * browser or an AudioContext. The suite delegates to this module for its
 * waveshaper curves and its expander gain law, so the tested math is the
 * shipped math, not a copy of it.
 *
 * What this module is not: a renderer. Biquad filtering, dynamics processing
 * by the browser, the worklet stages, and live metering still run on Web
 * Audio nodes and can only be verified in a browser.
 *
 * Loads as a classic script in the browser (global FIFDspMath) and as a
 * CommonJS module in Node (module.exports), with no dependencies.
 */
(function (global) {
  "use strict";

  function dbToGain(db) { return Math.pow(10, db / 20); }
  function gainToDb(gain) { return gain <= 0 ? -Infinity : 20 * Math.log10(gain); }

  /* Tanh saturation curve, as used by the Dynamics stage.
   * drivePct is the slider value, 0 to 100. k runs from 1 to 21, and the
   * curve is normalised by tanh(k) so full scale in gives full scale out. */
  function satK(drivePct) { return 1 + (drivePct / 100) * 20; }
  function satCurveValue(x, drivePct) {
    var k = satK(drivePct);
    return Math.tanh(k * x) / Math.tanh(k);
  }
  function buildSatCurve(drivePct, len) {
    len = len || 1024;
    var curve = new Float32Array(len);
    for (var i = 0; i < len; i++) {
      var x = (i / (len - 1)) * 2 - 1;
      curve[i] = satCurveValue(x, drivePct);
    }
    return curve;
  }

  /* Exciter curve: asymmetric saturation. Positive and negative halves use
   * different tanh rates (2.5 and 3.5), which is what synthesises the mix of
   * 2nd and 3rd harmonics described in the suite. */
  function exciterCurveValue(x) {
    return x >= 0 ? Math.tanh(2.5 * x) / Math.tanh(2.5)
                  : Math.tanh(3.5 * x) / Math.tanh(3.5);
  }
  function buildExciterCurve(len) {
    len = len || 1024;
    var curve = new Float32Array(len);
    for (var i = 0; i < len; i++) {
      var x = (i / (len - 1)) * 2 - 1;
      curve[i] = exciterCurveValue(x);
    }
    return curve;
  }

  /* Apply a waveshaper curve to one sample, the way a WaveShaperNode maps
   * an input in [-1, 1] onto the curve table, with linear interpolation
   * between table entries. Inputs outside [-1, 1] clamp to the end points. */
  function applyCurve(curve, x) {
    var clamped = Math.max(-1, Math.min(1, x));
    var pos = ((clamped + 1) / 2) * (curve.length - 1);
    var i0 = Math.floor(pos);
    var i1 = Math.min(curve.length - 1, i0 + 1);
    var frac = pos - i0;
    return curve[i0] * (1 - frac) + curve[i1] * frac;
  }

  /* Downward expander gain law, in the dB domain, as used by the Expander
   * stage: no reduction at or above threshold, and below threshold the
   * reduction grows by (1 - 1 / ratio) for each dB under threshold. */
  function expanderTargetDb(levelDb, thresholdDb, ratio) {
    if (levelDb >= thresholdDb) return 0;
    var reduction = -(thresholdDb - levelDb) * (1 - 1 / ratio);
    return reduction === 0 ? 0 : reduction;
  }

  /* One step of the expander envelope follower. The time constant is 5 ms
   * when the target rises and 150 ms when it falls, matching the suite, so
   * the gain moves smoothly and never steps. */
  function expanderEnvelopeStep(envDb, targetDb, dtSeconds) {
    var coef = targetDb > envDb ? 1 - Math.exp(-dtSeconds / 0.005)
                                : 1 - Math.exp(-dtSeconds / 0.15);
    return envDb + (targetDb - envDb) * coef;
  }

  /* Mic Fix gains for a correction amount in percent: a peaking cut at
   * 3.3 kHz and a peaking lift at 240 Hz, scaled together. */
  function micFixGains(amountPct) {
    var a = amountPct / 100;
    return { cutDb: a === 0 ? 0 : -6 * a, bodyDb: 3 * a };
  }

  /* Brickwall ceiling clamp, the offline equivalent of the limiter stage's
   * ceiling: no output sample exceeds the ceiling level. */
  function clampToCeiling(x, ceilingDb) {
    var ceiling = dbToGain(ceilingDb);
    return Math.max(-ceiling, Math.min(ceiling, x));
  }

  var api = {
    dbToGain: dbToGain,
    gainToDb: gainToDb,
    satK: satK,
    satCurveValue: satCurveValue,
    buildSatCurve: buildSatCurve,
    exciterCurveValue: exciterCurveValue,
    buildExciterCurve: buildExciterCurve,
    applyCurve: applyCurve,
    expanderTargetDb: expanderTargetDb,
    expanderEnvelopeStep: expanderEnvelopeStep,
    micFixGains: micFixGains,
    clampToCeiling: clampToCeiling
  };

  global.FIFDspMath = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
