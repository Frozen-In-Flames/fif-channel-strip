/* Frozen In Flames Channel Strip: the app shell.
 *
 * Product-line architecture: the shell owns the AudioContext, the source
 * (mic / file), the recorder + WAV export, the meters, and the startup
 * suite picker. All DSP lives in suites registered through FIFSuites
 * (see suites.js). Adding a chain = registering a suite; the shell is untouched.
 */
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  var dbToGain = function (db) { return Math.pow(10, db / 20); };
  var fmtDb = function (v) { return v.toFixed(1) + " dB"; };
  var fmtHz = function (v) {
    return v >= 1000 ? (v / 1000).toFixed(1) + " kHz" : Math.round(v) + " Hz";
  };
  function dbToWidth(db) {
    if (!isFinite(db)) return 0;
    return Math.max(0, Math.min(100, ((db + 60) / 60) * 100));
  }
  function dbText(db) { return isFinite(db) ? db.toFixed(1) + " dB" : "-inf dB"; }

  var ctx = null;
  var srcNode = null;
  var micStream = null;
  var fileBuffer = null;
  var msDest = null;      // MediaStreamAudioDestinationNode: taps the PROCESSED chain end
  var recorderNode = null;
  var chunks = [];
  var recording = false;

  var suiteDef = null;
  var inst = null;
  var pickedSuiteId = null;

  var shell = {
    ctx: null,
    $: $,
    dbToGain: dbToGain,
    fmtDb: fmtDb,
    fmtHz: fmtHz,
    rebuild: rebuild,
    srcNode: function () { return srcNode; }
  };

  function rebuild() {
    if (!inst || !ctx) return;
    inst.disconnect();
    // recTap is the MediaStream destination: the recorder captures the
    // processed chain output, never the raw mic.
    inst.connect(srcNode, ctx.destination, msDest);
  }

  /* ---------- sources ---------- */
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
      rebuild();
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
      rebuild();
      $("srcStatus").textContent = "Playing file: " + file.name;
    }).catch(function () {
      $("srcStatus").textContent = "Could not decode that file. Try WAV, MP3, or M4A.";
    });
  }

  /* ---------- recorder + WAV export (16-bit linear PCM, 44-byte RIFF) ---------- */
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
    recorderNode.port.postMessage({ recording: true });
    recording = true;
    $("recBtn").disabled = true;
    $("stopBtn").disabled = false;
    $("recStatus").textContent = "Recording the processed output...";
    $("dlLink").classList.add("hidden");
  }
  function stopRecording() {
    recorderNode.port.postMessage({ recording: false });
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

  /* ---------- shell UI ---------- */
  function renderSuitePicker() {
    var box = $("suitePicker");
    box.innerHTML = "";
    FIFSuites.list().forEach(function (s) {
      var b = document.createElement("button");
      b.className = "suite-pick" + (s.id === pickedSuiteId ? " active" : "");
      var h = document.createElement("div");
      h.className = "suite-pick-name";
      h.textContent = s.name;
      var p = document.createElement("div");
      p.className = "suite-pick-desc";
      p.textContent = s.description;
      var meta = document.createElement("div");
      meta.className = "suite-pick-meta";
      meta.textContent = s.stages.length + " stages. Patent ledger: " + s.patents;
      b.appendChild(h); b.appendChild(p); b.appendChild(meta);
      b.addEventListener("click", function () {
        pickedSuiteId = s.id;
        renderSuitePicker();
      });
      box.appendChild(b);
    });
  }

  function renderPresets() {
    var row = $("presetRow");
    row.innerHTML = "";
    inst.presets().forEach(function (p) {
      var b = document.createElement("button");
      b.className = "preset";
      b.setAttribute("data-preset", p.id);
      b.textContent = p.label;
      b.addEventListener("click", function () { inst.applyPreset(p.id); });
      row.appendChild(b);
    });
  }

  function wireShellUI() {
    $("srcMic").addEventListener("click", function () {
      $("srcMic").classList.add("active"); $("srcFile").classList.remove("active");
      useMic().catch(function () {
        $("srcStatus").textContent = "Mic permission was denied. You can still use an audio file.";
        $("srcMic").classList.remove("active"); $("srcFile").classList.add("active");
      });
    });
    $("srcFile").addEventListener("click", function () {
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
  }

  function meterLoop() {
    var m = inst.tick();
    $("meterIn").style.width = dbToWidth(m.dIn) + "%";
    $("meterOut").style.width = dbToWidth(m.dOut) + "%";
    $("meterGR").style.width = Math.max(0, Math.min(100, (m.gr / 24) * 100)) + "%";
    $("dbIn").textContent = dbText(m.dIn);
    $("dbOut").textContent = dbText(m.dOut);
    $("dbGR").textContent = m.gr.toFixed(1) + " dB";
    requestAnimationFrame(meterLoop);
  }

  /* ---------- boot ---------- */
  function boot() {
    if (FIFSuites.list().length === 0) {
      $("startOverlay").querySelector("p").textContent = "No suites registered.";
      return;
    }
    pickedSuiteId = FIFSuites.list()[0].id;
    renderSuitePicker();
    $("startBtn").addEventListener("click", function () {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) {
        $("startOverlay").querySelector("p").textContent =
          "This browser does not support the Web Audio API. Try Safari or Chrome.";
        return;
      }
      ctx = new AC({ latencyHint: "interactive" });
      shell.ctx = ctx;
      ctx.resume().then(function () {
        return ctx.audioWorklet.addModule("recorder-worklet.js");
      }).then(function () {
        // Recorder: the processed chain end feeds a MediaStreamDestination;
        // the recorder worklet samples THAT stream, so the WAV contains all
        // stages, never the raw mic.
        msDest = ctx.createMediaStreamDestination();
        var msSrc = ctx.createMediaStreamSource(msDest.stream);
        recorderNode = new AudioWorkletNode(ctx, "fif-recorder");
        recorderNode.port.onmessage = function (e) {
          if (e.data && e.data.samples) chunks.push(new Float32Array(e.data.samples));
        };
        var mute = ctx.createGain(); mute.gain.value = 0;
        msSrc.connect(recorderNode);
        recorderNode.connect(mute);
        mute.connect(ctx.destination);
        // boot the picked suite
        suiteDef = FIFSuites.get(pickedSuiteId);
        $("suiteCards").innerHTML = suiteDef.cardsHTML;
        inst = suiteDef.create(shell);
        inst.build();
        inst.bind();
        renderPresets();
        wireShellUI();
        return useMic();
      }).then(function () {
        $("startOverlay").classList.add("hidden");
        $("app").classList.remove("hidden");
        meterLoop();
      }).catch(function () {
        if (!ctx || !inst) {
          $("startOverlay").querySelector("p").textContent =
            "Audio failed to start in this browser. Try Safari or Chrome.";
          return;
        }
        $("startOverlay").classList.add("hidden");
        $("app").classList.remove("hidden");
        $("srcStatus").textContent = "Mic unavailable. Upload an audio file to process it.";
        $("srcMic").classList.remove("active"); $("srcFile").classList.add("active");
        meterLoop();
      });
    });
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden && ctx && ctx.state === "suspended") ctx.resume();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
