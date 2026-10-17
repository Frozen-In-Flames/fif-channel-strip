/* Frozen In Flames Channel Strip - vanilla Web Audio, no dependencies. */
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  var dbToGain = function (db) { return Math.pow(10, db / 20); };
  var fmtDb = function (v) { return v.toFixed(1) + " dB"; };
  var fmtHz = function (v) {
    return v >= 1000 ? (v / 1000).toFixed(1) + " kHz" : Math.round(v) + " Hz";
  };

  var ctx = null;
  var nodes = {};
  var srcNode = null;
  var micStream = null;
  var fileBuffer = null;
  var chunks = [];
  var recording = false;

  var bypass = { input: false, eq: false, comp: false, sat: true, limit: false, output: false };

  /* ---------- graph ---------- */

  function makeNodes() {
    var n = nodes;
    n.inputGain = ctx.createGain();
    n.inAn = ctx.createAnalyser(); n.inAn.fftSize = 2048;
    n.eqLow = ctx.createBiquadFilter(); n.eqLow.type = "lowshelf";
    n.eqMid1 = ctx.createBiquadFilter(); n.eqMid1.type = "peaking";
    n.eqMid2 = ctx.createBiquadFilter(); n.eqMid2.type = "peaking";
    n.eqHigh = ctx.createBiquadFilter(); n.eqHigh.type = "highshelf";
    n.comp = ctx.createDynamicsCompressor();
    n.sat = ctx.createWaveShaper(); n.sat.oversample = "4x";
    n.limiter = ctx.createDynamicsCompressor();
    n.limiter.knee.value = 0; n.limiter.ratio.value = 20;
    n.limiter.attack.value = 0.002; n.limiter.release.value = 0.05;
    n.outputGain = ctx.createGain();
    n.outAn = ctx.createAnalyser(); n.outAn.fftSize = 2048;
    n.recorder = new AudioWorkletNode(ctx, "fif-recorder");
    n.recorder.port.onmessage = function (e) {
      if (e.data && e.data.samples) chunks.push(new Float32Array(e.data.samples));
    };
    n.mute = ctx.createGain(); n.mute.gain.value = 0;
    n.recorder.connect(n.mute);
    n.mute.connect(ctx.destination);
  }

  function stageSeq() {
    var seq = [];
    if (!bypass.input) seq.push(nodes.inputGain);
    seq.push(nodes.inAn);
    if (!bypass.eq) seq.push(nodes.eqLow, nodes.eqMid1, nodes.eqMid2, nodes.eqHigh);
    if (!bypass.comp) seq.push(nodes.comp);
    if (!bypass.sat) seq.push(nodes.sat);
    if (!bypass.limit) seq.push(nodes.limiter);
    if (!bypass.output) seq.push(nodes.outputGain);
    seq.push(nodes.outAn);
    return seq;
  }

  function rebuildChain() {
    if (!ctx || !srcNode) return;
    var all = [nodes.inputGain, nodes.inAn, nodes.eqLow, nodes.eqMid1, nodes.eqMid2,
               nodes.eqHigh, nodes.comp, nodes.sat, nodes.limiter, nodes.outputGain, nodes.outAn];
    try { srcNode.disconnect(); } catch (e) {}
    all.forEach(function (nd) { try { nd.disconnect(); } catch (e) {} });
    var prev = srcNode;
    stageSeq().forEach(function (nd) { prev.connect(nd); prev = nd; });
    nodes.outAn.connect(ctx.destination);
    nodes.outAn.connect(nodes.recorder); // recording tap persists
  }

  function stopSource() {
    if (srcNode && srcNode.stop) { try { srcNode.stop(); } catch (e) {} }
    if (micStream) { micStream.getTracks().forEach(function (t) { t.stop(); }); micStream = null; }
    srcNode = null;
  }

  function useMic() {
    return navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
    }).then(function (stream) {
      stopSource();
      micStream = stream;
      srcNode = ctx.createMediaStreamSource(stream);
      rebuildChain();
      $("srcStatus").textContent = "Mic live. Speak or play into your iPhone.";
    });
  }

  function useFile(file) {
    return file.arrayBuffer().then(function (buf) {
      return ctx.decodeAudioData(buf);
    }).then(function (ab) {
      stopSource();
      fileBuffer = ab;
      srcNode = ctx.createBufferSource();
      srcNode.buffer = ab;
      srcNode.loop = $("fileLoop").checked;
      srcNode.start();
      rebuildChain();
      $("srcStatus").textContent = "Playing file: " + file.name;
    }).catch(function () {
      $("srcStatus").textContent = "Could not decode that file. Try WAV, MP3, or M4A.";
    });
  }

  /* ---------- parameters ---------- */

  function satCurve(drivePct) {
    var k = 1 + (drivePct / 100) * 20;
    var n = 1024, curve = new Float32Array(n), t = Math.tanh(k);
    for (var i = 0; i < n; i++) {
      var x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(k * x) / t;
    }
    return curve;
  }

  function bindRange(id, labelId, fmt, apply) {
    var el = $(id);
    var run = function () {
      var v = parseFloat(el.value);
      $(labelId).textContent = fmt(v);
      apply(v);
    };
    el.addEventListener("input", run);
    run();
  }

  function bindAll() {
    bindRange("inGain", "vInGain", fmtDb, function (v) { nodes.inputGain.gain.value = dbToGain(v); });
    bindRange("eqLowF", "vEqLowF", fmtHz, function (v) { nodes.eqLow.frequency.value = v; });
    bindRange("eqLowG", "vEqLowG", fmtDb, function (v) { nodes.eqLow.gain.value = v; });
    bindRange("eqM1F", "vEqM1F", fmtHz, function (v) { nodes.eqMid1.frequency.value = v; });
    bindRange("eqM1G", "vEqM1G", fmtDb, function (v) { nodes.eqMid1.gain.value = v; });
    bindRange("eqM1Q", "vEqM1Q", function (v) { return v.toFixed(1); }, function (v) { nodes.eqMid1.Q.value = v; });
    bindRange("eqM2F", "vEqM2F", fmtHz, function (v) { nodes.eqMid2.frequency.value = v; });
    bindRange("eqM2G", "vEqM2G", fmtDb, function (v) { nodes.eqMid2.gain.value = v; });
    bindRange("eqM2Q", "vEqM2Q", function (v) { return v.toFixed(1); }, function (v) { nodes.eqMid2.Q.value = v; });
    bindRange("eqHF", "vEqHF", fmtHz, function (v) { nodes.eqHigh.frequency.value = v; });
    bindRange("eqHG", "vEqHG", fmtDb, function (v) { nodes.eqHigh.gain.value = v; });
    bindRange("compT", "vCompT", fmtDb, function (v) { nodes.comp.threshold.value = v; });
    bindRange("compR", "vCompR", function (v) { return v.toFixed(1) + " : 1"; }, function (v) { nodes.comp.ratio.value = v; });
    bindRange("compA", "vCompA", function (v) { return Math.round(v) + " ms"; }, function (v) { nodes.comp.attack.value = v / 1000; });
    bindRange("compRel", "vCompRel", function (v) { return Math.round(v) + " ms"; }, function (v) { nodes.comp.release.value = v / 1000; });
    bindRange("satD", "vSatD", function (v) { return Math.round(v) + "%"; }, function (v) { nodes.sat.curve = satCurve(v); });
    bindRange("limC", "vLimC", fmtDb, function (v) { nodes.limiter.threshold.value = v; });
    bindRange("outGain", "vOutGain", fmtDb, function (v) { nodes.outputGain.gain.value = dbToGain(v); });
  }

  /* ---------- presets ---------- */

  var SLIDERS = ["inGain", "eqLowF", "eqLowG", "eqM1F", "eqM1G", "eqM1Q",
                 "eqM2F", "eqM2G", "eqM2Q", "eqHF", "eqHG",
                 "compT", "compR", "compA", "compRel", "satD", "limC", "outGain"];

  var PRESETS = {
    clean: { inGain: 0, eqLowF: 120, eqLowG: 0, eqM1F: 800, eqM1G: 0, eqM1Q: 1,
             eqM2F: 3000, eqM2G: 0, eqM2Q: 1, eqHF: 8000, eqHG: 0,
             compT: -18, compR: 2, compA: 10, compRel: 200, satD: 50, limC: -1, outGain: 0,
             bypass: { input: false, eq: false, comp: false, sat: true, limit: false, output: false } },
    vocal: { inGain: 3, eqLowF: 100, eqLowG: -2, eqM1F: 500, eqM1G: -1, eqM1Q: 1,
             eqM2F: 3000, eqM2G: 4, eqM2Q: 1.2, eqHF: 9000, eqHG: 1,
             compT: -20, compR: 4, compA: 3, compRel: 150, satD: 25, limC: -1, outGain: 1,
             bypass: { input: false, eq: false, comp: false, sat: false, limit: false, output: false } },
    tape:  { inGain: 2, eqLowF: 120, eqLowG: 3, eqM1F: 400, eqM1G: 1, eqM1Q: 0.8,
             eqM2F: 2500, eqM2G: -1, eqM2Q: 1, eqHF: 8000, eqHG: -3,
             compT: -14, compR: 2.5, compA: 15, compRel: 300, satD: 65, limC: -1.5, outGain: 0,
             bypass: { input: false, eq: false, comp: false, sat: false, limit: false, output: false } }
  };

  function refreshBypassButtons() {
    document.querySelectorAll("[data-bypass]").forEach(function (btn) {
      var key = btn.getAttribute("data-bypass");
      var on = !bypass[key];
      btn.classList.toggle("active", !on);
      btn.textContent = on ? "Bypass" : "Bypassed";
    });
  }

  function applyPreset(name) {
    var p = PRESETS[name];
    if (!p) return;
    SLIDERS.forEach(function (id) {
      var el = $(id);
      el.value = p[id];
      el.dispatchEvent(new Event("input"));
    });
    Object.keys(p.bypass).forEach(function (k) { bypass[k] = p.bypass[k]; });
    refreshBypassButtons();
    rebuildChain();
    document.querySelectorAll(".preset").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-preset") === name);
    });
  }

  /* ---------- meters ---------- */

  var meterBuf = new Float32Array(2048);
  function peakDb(an) {
    an.getFloatTimeDomainData(meterBuf);
    var peak = 0;
    for (var i = 0; i < meterBuf.length; i++) {
      var a = Math.abs(meterBuf[i]);
      if (a > peak) peak = a;
    }
    return peak <= 0.00001 ? -Infinity : 20 * Math.log10(peak);
  }
  function dbToWidth(db) {
    if (!isFinite(db)) return 0;
    return Math.max(0, Math.min(100, ((db + 60) / 60) * 100));
  }
  function dbText(db) { return isFinite(db) ? db.toFixed(1) + " dB" : "-inf dB"; }

  function meterLoop() {
    var dIn = peakDb(nodes.inAn);
    var dOut = peakDb(nodes.outAn);
    var gr = (typeof nodes.comp.reduction === "number") ? -nodes.comp.reduction : 0;
    $("meterIn").style.width = dbToWidth(dIn) + "%";
    $("meterOut").style.width = dbToWidth(dOut) + "%";
    $("meterGR").style.width = Math.max(0, Math.min(100, (gr / 24) * 100)) + "%";
    $("dbIn").textContent = dbText(dIn);
    $("dbOut").textContent = dbText(dOut);
    $("dbGR").textContent = gr.toFixed(1) + " dB";
    requestAnimationFrame(meterLoop);
  }

  /* ---------- recording + WAV ---------- */

  function encodeWav(chunksArr, sampleRate) {
    var total = 0, i;
    for (i = 0; i < chunksArr.length; i++) total += chunksArr[i].length;
    var data = new Float32Array(total), off = 0;
    for (i = 0; i < chunksArr.length; i++) { data.set(chunksArr[i], off); off += chunksArr[i].length; }
    var buf = new ArrayBuffer(44 + data.length * 2);
    var v = new DataView(buf);
    function wstr(o, s) { for (var j = 0; j < s.length; j++) v.setUint8(o + j, s.charCodeAt(j)); }
    wstr(0, "RIFF"); v.setUint32(4, 36 + data.length * 2, true); wstr(8, "WAVE");
    wstr(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, 1, true); v.setUint32(24, sampleRate, true);
    v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    wstr(36, "data"); v.setUint32(40, data.length * 2, true);
    for (i = 0; i < data.length; i++) {
      var s = Math.max(-1, Math.min(1, data[i]));
      v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Blob([buf], { type: "audio/wav" });
  }

  function startRecording() {
    chunks = [];
    nodes.recorder.port.postMessage({ recording: true });
    recording = true;
    $("recBtn").disabled = true;
    $("stopBtn").disabled = false;
    $("recStatus").textContent = "Recording the processed output...";
    $("dlLink").classList.add("hidden");
  }

  function stopRecording() {
    nodes.recorder.port.postMessage({ recording: false });
    recording = false;
    $("recBtn").disabled = false;
    $("stopBtn").disabled = true;
    var blob = encodeWav(chunks, ctx.sampleRate);
    var url = URL.createObjectURL(blob);
    var a = $("dlLink");
    a.href = url;
    a.classList.remove("hidden");
    var secs = chunks.reduce(function (t, c) { return t + c.length; }, 0) / ctx.sampleRate;
    $("recStatus").textContent = "Recorded " + secs.toFixed(1) + "s at " + ctx.sampleRate + " Hz. Tap download to save the WAV.";
  }

  /* ---------- boot ---------- */

  function wireUI() {
    document.querySelectorAll("[data-bypass]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.getAttribute("data-bypass");
        bypass[key] = !bypass[key];
        refreshBypassButtons();
        rebuildChain();
      });
    });
    document.querySelectorAll(".preset").forEach(function (b) {
      b.addEventListener("click", function () { applyPreset(b.getAttribute("data-preset")); });
    });
    $("srcMic").addEventListener("click", function () {
      $("srcMic").classList.add("active"); $("srcFile").classList.remove("active");
      useMic().catch(function () {
        $("srcStatus").textContent = "Mic permission was denied. You can still use an audio file.";
        $("srcMic").classList.remove("active"); $("srcFile").classList.add("active");
      });
    });
    $("srcFile").addEventListener("click", function () {
      $("srcMic").classList.add("active"); $("srcFile").classList.remove("active");
      // keep mic active until a file is chosen; button just highlights the file path
      $("srcMic").classList.remove("active"); $("srcFile").classList.add("active");
      $("fileInput").click();
    });
    $("fileInput").addEventListener("change", function (e) {
      if (e.target.files.length > 0) useFile(e.target.files[0]);
    });
    $("fileLoop").addEventListener("change", function () {
      if (srcNode && srcNode.loop !== undefined) srcNode.loop = $("fileLoop").checked;
    });
    $("recBtn").addEventListener("click", startRecording);
    $("stopBtn").addEventListener("click", stopRecording);
    refreshBypassButtons();
  }

  function boot() {
    $("startBtn").addEventListener("click", function () {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) {
        $("startOverlay").querySelector("p").textContent =
          "This browser does not support the Web Audio API. Try Safari or Chrome.";
        return;
      }
      ctx = new AC({ latencyHint: "interactive" });
      ctx.resume().then(function () {
        return ctx.audioWorklet.addModule("recorder-worklet.js");
      }).then(function () {
        makeNodes();
        bindAll();
        wireUI();
        return useMic();
      }).then(function () {
        $("startOverlay").classList.add("hidden");
        $("app").classList.remove("hidden");
        meterLoop();
      }).catch(function () {
        // Mic denied: still boot with file source available.
        if (!ctx) return;
        makeNodes(); bindAll(); wireUI();
        $("startOverlay").classList.add("hidden");
        $("app").classList.remove("hidden");
        $("srcStatus").textContent = "Mic unavailable. Upload an audio file to process it.";
        $("srcMic").classList.remove("active"); $("srcFile").classList.add("active");
        meterLoop();
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
