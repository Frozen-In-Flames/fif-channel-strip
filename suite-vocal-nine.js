/* Suite: Vocal Nine. The merged 9-stage chain, first entry in the FIF registry.
 * Vanilla Web Audio, no dependencies. Patent ledger: PATENTS.md. */
FIFSuites.register({
  id: "vocal-nine",
  name: "Vocal Nine",
  description: "The 9-stage vocal chain for phone and cheap mics in untreated rooms: analyze, noise print, expander, feedback killer, cleanup, mic fix, de-esser, exciter, dynamics, plus optional studio spectral cleanup and WAV export.",
  stages: [
    "Analyze: 64-band spectrum, true-peak, clip/DC",
    "Noise Print: room tone profile",
    "Expander: downward expander, print-derived threshold",
    "Feedback Killer: Sabine detection, notch pool, room scan",
    "Cleanup: HPF + hum notches",
    "Mic Fix: iPhone transducer correction + corrective EQ",
    "De-esser: 6.8 kHz split-band",
    "Exciter: asymmetric harmonic synthesis",
    "Dynamics: compressor, tanh saturation, 1 ms brickwall limiter",
    "Studio Cleanup (toggle): spectral NR, dereverb, transient shaper",
    "Export: 16-bit WAV, canonical 44-byte RIFF"
  ],
  patents: "PATENTS.md",
  cardsHTML: `
  <!-- Analyze: understand the input before treating it -->
  <section class="card">
    <h2>Analyze</h2>
    <canvas id="specCanvas" width="520" height="140" class="spec"></canvas>
    <canvas id="bandCanvas" width="520" height="64" class="spec"></canvas>
    <div class="row diag-row">
      <span>Noise floor <b id="noiseFloor">--</b></span>
      <span>Peak <b id="truePeak">--</b></span>
      <span>Clip <button id="clipLed" class="led" title="Tap to clear">OK</button></span>
      <span>DC <b id="dcLed" class="led">OK</b></span>
    </div>
    <div class="row">
      <button id="noisePrintBtn" class="seg">Capture noise print (1.5s)</button>
    </div>
    <p id="noisePrintStatus" class="status">Stay quiet for 1.5 seconds while it learns your room tone. The print sets the gate suggestion.</p>
    <p class="status">iOS keeps some mic processing on. The noise print measures what is actually there, so the gate suggestion stays honest.</p>
  </section>

  <!-- Cleanup: HPF + hum notches, first DSP in the chain -->
  <section class="card" data-stage="cleanup">
    <div class="card-head"><h2>Cleanup</h2><button class="bypass" data-bypass="cleanup">Bypass</button></div>
    <p class="desc">Steep high-pass kills handling thumps and rumble. Hum notches kill mains buzz at 50 or 60 Hz plus harmonics.</p>
    <label class="ctl"><span>High-pass <b id="vHpfF">80 Hz</b></span>
      <input type="range" id="hpfF" min="40" max="220" step="5" value="80"></label>
    <div class="row">
      <span class="meter-label">Hum</span>
      <button class="seg humsel" data-hum="off">Off</button>
      <button class="seg humsel" data-hum="50">50 Hz</button>
      <button class="seg humsel active" data-hum="60">60 Hz</button>
    </div>
  </section>

  <!-- Expander gate -->
  <section class="card" data-stage="gate">
    <div class="card-head"><h2>Expander</h2><button class="bypass" data-bypass="gate">Bypass</button></div>
    <p class="desc">Downward expander with a smooth logarithmic envelope. Quiets the room between phrases instead of chopping them. The noise print suggests the threshold.</p>
    <label class="ctl"><span>Threshold <b id="vGateT">-40 dB</b></span>
      <input type="range" id="gateT" min="-60" max="0" step="1" value="-40"></label>
    <label class="ctl"><span>Ratio <b id="vGateR">2.0 : 1</b></span>
      <input type="range" id="gateR" min="1" max="10" step="0.5" value="2"></label>
    <p id="gateSuggest" class="status">No noise print yet. Capture one above for a suggested threshold.</p>
  </section>

  <!-- Feedback Killer -->
  <section class="card" data-stage="feedback">
    <div class="card-head"><h2>Feedback Killer</h2><button class="bypass" data-bypass="feedback">Bypass</button></div>
    <p class="desc">Finds sustained ringing frequencies in the live input and notches them out. Detection uses the Sabine criteria: constant frequency, growing magnitude, no harmonics, persistent across spectra.</p>
    <div class="row">
      <button id="huntBtn" class="seg">Hunt ringing</button>
      <button id="roomScanBtn" class="seg">Scan room</button>
      <button id="notchClear" class="seg">Clear notches</button>
    </div>
    <label class="ctl"><span>Manual notch <b id="vNotchF">1.0 kHz</b></span>
      <input type="range" id="notchF" min="50" max="8000" step="10" value="1000"></label>
    <div class="row"><button id="notchAdd" class="seg">Add notch</button></div>
    <p id="huntStatus" class="status">No notches active. Scan room finds modal peaks below 300 Hz.</p>
    <div id="notchList" class="notch-list"></div>
  </section>

  <!-- Mic Fix: iPhone transducer correction -->
  <section class="card" data-stage="micfix">
    <div class="card-head"><h2>Mic Fix</h2><button class="bypass" data-bypass="micfix">Bypass</button></div>
    <p class="desc">Corrects the phone capsule: tames the harsh 3.3 kHz resonance peak and restores 240 Hz chest body.</p>
    <label class="ctl"><span>Correction <b id="vMicAmt">70%</b></span>
      <input type="range" id="micAmt" min="0" max="100" step="5" value="70"></label>
  </section>

  <!-- Studio Cleanup: STFT work (toggled, heavy) -->
  <section class="card">
    <div class="card-head"><h2>Studio Cleanup</h2><button id="studioToggle" class="bypass">Off</button></div>
    <p class="desc">Deep spectral work in one pass: noise reduction from your noise print, reverb tail suppression, transient shaping. Heavy processing; enable when your phone keeps up.</p>
    <label class="ctl"><span>NR amount <b id="vNrAlpha">1.4</b></span>
      <input type="range" id="nrAlpha" min="0" max="2" step="0.1" value="1.4"></label>
    <label class="ctl"><span>NR floor <b id="vNrFloor">-15.0 dB</b></span>
      <input type="range" id="nrFloor" min="-20" max="-11" step="1" value="-15"></label>
    <label class="ctl"><span>Dereverb <b id="vDrvAmt">50%</b></span>
      <input type="range" id="drvAmt" min="0" max="100" step="5" value="50"></label>
    <label class="ctl"><span>Shaper attack <b id="vAtkSh">+6 dB</b></span>
      <input type="range" id="atkSh" min="-15" max="15" step="1" value="6"></label>
    <label class="ctl"><span>Shaper sustain <b id="vSusSh">+0 dB</b></span>
      <input type="range" id="susSh" min="-24" max="24" step="1" value="0"></label>
    <p id="studioStatus" class="status">Studio cleanup bypassed.</p>
  </section>

  <!-- Input trim -->
  <section class="card" data-stage="input">
    <div class="card-head"><h2>Input</h2><button class="bypass" data-bypass="input">Bypass</button></div>
    <label class="ctl"><span>Trim <b id="vInGain">0.0 dB</b></span>
      <input type="range" id="inGain" min="-24" max="24" step="0.5" value="0"></label>
  </section>

  <!-- Corrective EQ -->
  <section class="card" data-stage="eq">
    <div class="card-head"><h2>Corrective EQ</h2><button class="bypass" data-bypass="eq">Bypass</button></div>
    <h3>Low shelf</h3>
    <label class="ctl"><span>Freq <b id="vEqLowF">120 Hz</b></span>
      <input type="range" id="eqLowF" min="40" max="500" step="5" value="120"></label>
    <label class="ctl"><span>Gain <b id="vEqLowG">0.0 dB</b></span>
      <input type="range" id="eqLowG" min="-12" max="12" step="0.5" value="0"></label>
    <h3>Mid 1</h3>
    <label class="ctl"><span>Freq <b id="vEqM1F">800 Hz</b></span>
      <input type="range" id="eqM1F" min="100" max="2000" step="10" value="800"></label>
    <label class="ctl"><span>Gain <b id="vEqM1G">0.0 dB</b></span>
      <input type="range" id="eqM1G" min="-12" max="12" step="0.5" value="0"></label>
    <label class="ctl"><span>Q <b id="vEqM1Q">1.0</b></span>
      <input type="range" id="eqM1Q" min="0.5" max="6" step="0.1" value="1"></label>
    <h3>Mid 2</h3>
    <label class="ctl"><span>Freq <b id="vEqM2F">3.0 kHz</b></span>
      <input type="range" id="eqM2F" min="1000" max="8000" step="10" value="3000"></label>
    <label class="ctl"><span>Gain <b id="vEqM2G">0.0 dB</b></span>
      <input type="range" id="eqM2G" min="-12" max="12" step="0.5" value="0"></label>
    <label class="ctl"><span>Q <b id="vEqM2Q">1.0</b></span>
      <input type="range" id="eqM2Q" min="0.5" max="6" step="0.1" value="1"></label>
    <h3>High shelf</h3>
    <label class="ctl"><span>Freq <b id="vEqHF">8.0 kHz</b></span>
      <input type="range" id="eqHF" min="4000" max="16000" step="50" value="8000"></label>
    <label class="ctl"><span>Gain <b id="vEqHG">0.0 dB</b></span>
      <input type="range" id="eqHG" min="-12" max="12" step="0.5" value="0"></label>
  </section>

  <!-- De-esser -->
  <section class="card" data-stage="deess">
    <div class="card-head"><h2>De-esser</h2><button class="bypass" data-bypass="deess">Bypass</button></div>
    <p class="desc">Tames sibilance by compressing only the high band. The low band passes through untouched.</p>
    <label class="ctl"><span>Split freq <b id="vDeEssF">6.8 kHz</b></span>
      <input type="range" id="deEssF" min="4000" max="10000" step="100" value="6800"></label>
    <label class="ctl"><span>Threshold <b id="vDeEssT">-27.0 dB</b></span>
      <input type="range" id="deEssT" min="-48" max="0" step="1" value="-27"></label>
    <label class="ctl"><span>Ratio <b id="vDeEssR">6 : 1</b></span>
      <input type="range" id="deEssR" min="1" max="12" step="0.5" value="6"></label>
  </section>

  <!-- Exciter -->
  <section class="card" data-stage="exciter">
    <div class="card-head"><h2>Exciter</h2><button class="bypass" data-bypass="exciter">Bypass</button></div>
    <p class="desc">High-passed sidechain through asymmetric saturation synthesizes 2nd and 3rd harmonics for air and presence.</p>
    <label class="ctl"><span>Amount <b id="vExcAmt">10%</b></span>
      <input type="range" id="excAmt" min="0" max="30" step="1" value="10"></label>
  </section>

  <!-- Compressor -->
  <section class="card" data-stage="comp">
    <div class="card-head"><h2>Compressor</h2><button class="bypass" data-bypass="comp">Bypass</button></div>
    <label class="ctl"><span>Threshold <b id="vCompT">-18 dB</b></span>
      <input type="range" id="compT" min="-48" max="0" step="1" value="-18"></label>
    <label class="ctl"><span>Ratio <b id="vCompR">2 : 1</b></span>
      <input type="range" id="compR" min="1" max="20" step="0.5" value="2"></label>
    <label class="ctl"><span>Attack <b id="vCompA">10 ms</b></span>
      <input type="range" id="compA" min="1" max="100" step="1" value="10"></label>
    <label class="ctl"><span>Release <b id="vCompRel">200 ms</b></span>
      <input type="range" id="compRel" min="20" max="1000" step="10" value="200"></label>
  </section>

  <!-- Saturation -->
  <section class="card" data-stage="sat">
    <div class="card-head"><h2>Saturation</h2><button class="bypass active" data-bypass="sat">Bypassed</button></div>
    <p class="desc">Tanh waveshaper adds body and harmonic weight to thin phone audio.</p>
    <label class="ctl"><span>Drive <b id="vSatD">50%</b></span>
      <input type="range" id="satD" min="0" max="100" step="1" value="50"></label>
  </section>

  <!-- Limiter -->
  <section class="card" data-stage="limit">
    <div class="card-head"><h2>Limiter</h2><button class="bypass" data-bypass="limit">Bypass</button></div>
    <p class="desc">1 ms brickwall. Tames the harsh transient peaks cheap mics exaggerate.</p>
    <label class="ctl"><span>Ceiling <b id="vLimC">-1.0 dB</b></span>
      <input type="range" id="limC" min="-12" max="0" step="0.5" value="-1"></label>
  </section>

  <!-- Output -->
  <section class="card" data-stage="output">
    <div class="card-head"><h2>Output</h2><button class="bypass" data-bypass="output">Bypass</button></div>
    <label class="ctl"><span>Level <b id="vOutGain">0.0 dB</b></span>
      <input type="range" id="outGain" min="-24" max="24" step="0.5" value="0"></label>
  </section>
  `,
  create: function (S) {
    "use strict";
    var $ = S.$, ctx = S.ctx;
    var dbToGain = S.dbToGain, fmtDb = S.fmtDb, fmtHz = S.fmtHz;

    /* ---------- state ---------- */
    var nodes = {};
    var connectedSrc = null;
    var bypass = { input: false, cleanup: false, gate: false, feedback: false,
                   micfix: false, eq: false, deess: false, exciter: false,
                   comp: false, sat: true, limit: false, output: false };
    var notchList = [];
    var noiseProfile = null;
    var floorEnv = -80;
    var clipLatched = false;
    var gateEnvDb = 0;
    var gateThresholdDb = -40;
    var humSel = "60";
    var studioOn = false;

    /* ---------- graph ---------- */
    function makeNodes() {
      var n = nodes;
      n.inputGain = ctx.createGain();
      n.inAn = ctx.createAnalyser(); n.inAn.fftSize = 2048;
      n.specAn = ctx.createAnalyser(); n.specAn.fftSize = 4096; n.specAn.smoothingTimeConstant = 0.7;
      n.hpf = ctx.createBiquadFilter(); n.hpf.type = "highpass"; n.hpf.frequency.value = 80;
      n.hum = [];
      for (var h = 0; h < 4; h++) {
        var hn = ctx.createBiquadFilter(); hn.type = "notch"; hn.Q.value = 30;
        hn.frequency.value = 60 * (h + 1);
        n.hum.push(hn);
      }
      n.gateGain = ctx.createGain();
      // Mic Fix: iPhone transducer correction. Cut the harsh 3.3 kHz capsule
      // resonance, restore 240 Hz chest body. Amount morphs both.
      n.micCut = ctx.createBiquadFilter(); n.micCut.type = "peaking";
      n.micCut.frequency.value = 3300; n.micCut.Q.value = 2; n.micCut.gain.value = -4.2;
      n.micBody = ctx.createBiquadFilter(); n.micBody.type = "peaking";
      n.micBody.frequency.value = 240; n.micBody.Q.value = 1; n.micBody.gain.value = 2.1;
      n.eqLow = ctx.createBiquadFilter(); n.eqLow.type = "lowshelf";
      n.eqMid1 = ctx.createBiquadFilter(); n.eqMid1.type = "peaking";
      n.eqMid2 = ctx.createBiquadFilter(); n.eqMid2.type = "peaking";
      n.eqHigh = ctx.createBiquadFilter(); n.eqHigh.type = "highshelf";
      // De-esser: split-band, fast compressor on the high band only.
      n.deEssLP = ctx.createBiquadFilter(); n.deEssLP.type = "lowpass";
      n.deEssLP.frequency.value = 6800;
      n.deEssHP = ctx.createBiquadFilter(); n.deEssHP.type = "highpass";
      n.deEssHP.frequency.value = 6800;
      n.deEssComp = ctx.createDynamicsCompressor();
      n.deEssComp.threshold.value = -27; n.deEssComp.ratio.value = 6;
      n.deEssComp.attack.value = 0.002; n.deEssComp.release.value = 0.08;
      n.deEssComp.knee.value = 6;
      n.deEssMerge = ctx.createGain();
      // Exciter: high-passed sidechain through asymmetric saturation, which
      // synthesizes 2nd and 3rd harmonics; blended back under the dry signal.
      n.excHP = ctx.createBiquadFilter(); n.excHP.type = "highpass";
      n.excHP.frequency.value = 3000;
      n.excShape = ctx.createWaveShaper(); n.excShape.oversample = "4x";
      n.excShape.curve = exciterCurve();
      n.excGain = ctx.createGain(); n.excGain.gain.value = 0.10;
      n.excMerge = ctx.createGain();
      n.comp = ctx.createDynamicsCompressor();
      n.sat = ctx.createWaveShaper(); n.sat.oversample = "4x";
      n.limiter = ctx.createDynamicsCompressor();
      n.limiter.knee.value = 0; n.limiter.ratio.value = 20;
      n.limiter.attack.value = 0.001; n.limiter.release.value = 0.05; // 1 ms brickwall
      n.outputGain = ctx.createGain();
      n.outAn = ctx.createAnalyser(); n.outAn.fftSize = 2048;
      n.studio = null; // fif-cleanup worklet node, created when toggled on
    }

    function exciterCurve() {
      var len = 1024, curve = new Float32Array(len);
      for (var i = 0; i < len; i++) {
        var x = (i / (len - 1)) * 2 - 1;
        curve[i] = x >= 0 ? Math.tanh(2.5 * x) / Math.tanh(2.5)
                          : Math.tanh(3.5 * x) / Math.tanh(3.5);
      }
      return curve;
    }

    function satCurve(drivePct) {
      var k = 1 + (drivePct / 100) * 20;
      var len = 1024, curve = new Float32Array(len), t = Math.tanh(k);
      for (var i = 0; i < len; i++) {
        var x = (i / (len - 1)) * 2 - 1;
        curve[i] = Math.tanh(k * x) / t;
      }
      return curve;
    }

    // Signal order: trim -> analysis -> HPF -> hum -> expander -> feedback/room
    // notches -> mic fix -> studio cleanup (toggled) -> corrective EQ ->
    // de-esser -> exciter -> compressor -> tanh saturator -> 1 ms limiter -> out.
    function connect(src, dest, recTap) {
      if (!src) return;
      disconnect();
      connectedSrc = src;
      var prev = src;
      function link(node) { prev.connect(node); prev = node; }
      if (!bypass.input) link(nodes.inputGain);
      link(nodes.inAn); link(nodes.specAn);
      if (!bypass.cleanup) {
        link(nodes.hpf);
        if (humSel !== "off") nodes.hum.forEach(function (hn) { link(hn); });
      }
      if (!bypass.gate) link(nodes.gateGain);
      if (!bypass.feedback) notchList.forEach(function (w) { link(w.node); });
      if (!bypass.micfix) { link(nodes.micCut); link(nodes.micBody); }
      if (studioOn && nodes.studio) link(nodes.studio);
      if (!bypass.eq) [nodes.eqLow, nodes.eqMid1, nodes.eqMid2, nodes.eqHigh].forEach(link);
      if (!bypass.deess) {
        prev.connect(nodes.deEssLP); prev.connect(nodes.deEssHP);
        nodes.deEssLP.connect(nodes.deEssMerge);
        nodes.deEssHP.connect(nodes.deEssComp);
        nodes.deEssComp.connect(nodes.deEssMerge);
        prev = nodes.deEssMerge;
      }
      if (!bypass.exciter) {
        prev.connect(nodes.excMerge);
        prev.connect(nodes.excHP);
        nodes.excHP.connect(nodes.excShape);
        nodes.excShape.connect(nodes.excGain);
        nodes.excGain.connect(nodes.excMerge);
        prev = nodes.excMerge;
      }
      if (!bypass.comp) link(nodes.comp);
      if (!bypass.sat) link(nodes.sat);
      if (!bypass.limit) link(nodes.limiter);
      if (!bypass.output) link(nodes.outputGain);
      link(nodes.outAn);
      nodes.outAn.connect(dest);
      nodes.outAn.connect(recTap);
    }

    function disconnect() {
      var all = [nodes.inputGain, nodes.inAn, nodes.specAn, nodes.hpf, nodes.gateGain,
                 nodes.micCut, nodes.micBody,
                 nodes.eqLow, nodes.eqMid1, nodes.eqMid2, nodes.eqHigh,
                 nodes.deEssLP, nodes.deEssHP, nodes.deEssComp, nodes.deEssMerge,
                 nodes.excHP, nodes.excShape, nodes.excGain, nodes.excMerge,
                 nodes.comp, nodes.sat, nodes.limiter, nodes.outputGain, nodes.outAn];
      notchList.forEach(function (w) { all.push(w.node); });
      nodes.hum.forEach(function (hn) { all.push(hn); });
      if (nodes.studio) all.push(nodes.studio);
      if (connectedSrc) { try { connectedSrc.disconnect(); } catch (e) {} }
      all.forEach(function (nd) { try { nd.disconnect(); } catch (e) {} });
      connectedSrc = null;
    }

    /* ---------- controls ---------- */
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
      bindRange("gateT", "vGateT", fmtDb, function (v) { gateThresholdDb = v; });
      bindRange("gateR", "vGateR", function (v) { return v.toFixed(1) + " : 1"; }, function () {});
      bindRange("hpfF", "vHpfF", fmtHz, function (v) { nodes.hpf.frequency.value = v; });
      bindRange("micAmt", "vMicAmt", function (v) { return Math.round(v) + "%"; }, function (v) {
        var a = v / 100;
        nodes.micCut.gain.value = -6 * a;
        nodes.micBody.gain.value = 3 * a;
      });
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
      bindRange("deEssF", "vDeEssF", fmtHz, function (v) {
        nodes.deEssLP.frequency.value = v; nodes.deEssHP.frequency.value = v;
      });
      bindRange("deEssT", "vDeEssT", fmtDb, function (v) { nodes.deEssComp.threshold.value = v; });
      bindRange("deEssR", "vDeEssR", function (v) { return v.toFixed(1) + " : 1"; },
        function (v) { nodes.deEssComp.ratio.value = v; });
      bindRange("excAmt", "vExcAmt", function (v) { return Math.round(v) + "%"; },
        function (v) { nodes.excGain.gain.value = v / 100; });
      bindRange("compT", "vCompT", fmtDb, function (v) { nodes.comp.threshold.value = v; });
      bindRange("compR", "vCompR", function (v) { return v.toFixed(1) + " : 1"; }, function (v) { nodes.comp.ratio.value = v; });
      bindRange("compA", "vCompA", function (v) { return Math.round(v) + " ms"; }, function (v) { nodes.comp.attack.value = v / 1000; });
      bindRange("compRel", "vCompRel", function (v) { return Math.round(v) + " ms"; }, function (v) { nodes.comp.release.value = v / 1000; });
      bindRange("satD", "vSatD", function (v) { return Math.round(v) + "%"; }, function (v) { nodes.sat.curve = satCurve(v); });
      bindRange("limC", "vLimC", fmtDb, function (v) { nodes.limiter.threshold.value = v; });
      bindRange("outGain", "vOutGain", fmtDb, function (v) { nodes.outputGain.gain.value = dbToGain(v); });
      var studioFmt = {
        nrAlpha: ["vNrAlpha", function (v) { return v.toFixed(1); }],
        nrFloor: ["vNrFloor", fmtDb],
        drvAmt: ["vDrvAmt", function (v) { return Math.round(v) + "%"; }],
        atkSh: ["vAtkSh", function (v) { return (v >= 0 ? "+" : "") + Math.round(v) + " dB"; }],
        susSh: ["vSusSh", function (v) { return (v >= 0 ? "+" : "") + Math.round(v) + " dB"; }]
      };
      Object.keys(studioFmt).forEach(function (id) {
        var el = $(id), lab = studioFmt[id][0], fmt = studioFmt[id][1];
        el.addEventListener("input", function () {
          $(lab).textContent = fmt(parseFloat(el.value));
          sendStudioConfig();
        });
        $(lab).textContent = fmt(parseFloat(el.value));
      });
      document.querySelectorAll(".humsel").forEach(function (b) {
        b.addEventListener("click", function () { setHum(b.getAttribute("data-hum")); });
      });
      setHum(humSel);
      $("studioToggle").addEventListener("click", function () { setStudio(!studioOn); });
      document.querySelectorAll("[data-bypass]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var key = btn.getAttribute("data-bypass");
          bypass[key] = !bypass[key];
          refreshBypassButtons();
          S.rebuild();
        });
      });
      $("clipLed").addEventListener("click", function () { clipLatched = false; });
      $("noisePrintBtn").addEventListener("click", captureNoisePrint);
      $("huntBtn").addEventListener("click", huntFeedback);
      $("roomScanBtn").addEventListener("click", scanRoom);
      $("notchAdd").addEventListener("click", function () {
        addNotch(parseFloat($("notchF").value), false);
      });
      $("notchClear").addEventListener("click", clearNotches);
      $("notchF").addEventListener("input", function () {
        $("vNotchF").textContent = fmtHz(parseFloat($("notchF").value));
      });
      renderNotches();
      refreshBypassButtons();
    }

    /* ---------- presets ---------- */
    var SLIDERS = ["inGain", "gateT", "gateR", "hpfF", "micAmt",
                   "eqLowF", "eqLowG", "eqM1F", "eqM1G", "eqM1Q",
                   "eqM2F", "eqM2G", "eqM2Q", "eqHF", "eqHG",
                   "deEssF", "deEssT", "deEssR", "excAmt",
                   "compT", "compR", "compA", "compRel", "satD", "limC", "outGain"];
    var PRESET_DEFS = [
      { id: "clean", label: "Clean" },
      { id: "vocal", label: "Vocal Punch" },
      { id: "tape", label: "Warm Tape" }
    ];
    var PRESETS = {
      clean: { inGain: 0, gateT: -40, gateR: 2, hpfF: 80, micAmt: 70,
               eqLowF: 120, eqLowG: 0, eqM1F: 800, eqM1G: 0, eqM1Q: 1,
               eqM2F: 3000, eqM2G: 0, eqM2Q: 1, eqHF: 8000, eqHG: 0,
               deEssF: 6800, deEssT: -27, deEssR: 6, excAmt: 10,
               compT: -18, compR: 2, compA: 10, compRel: 200, satD: 50, limC: -1, outGain: 0,
               bypass: { input: false, cleanup: false, gate: false, feedback: false, micfix: false,
                         eq: false, deess: false, exciter: false, comp: false, sat: true, limit: false, output: false } },
      vocal: { inGain: 3, gateT: -45, gateR: 2.5, hpfF: 90, micAmt: 80,
               eqLowF: 100, eqLowG: -2, eqM1F: 500, eqM1G: -1, eqM1Q: 1,
               eqM2F: 3000, eqM2G: 4, eqM2Q: 1.2, eqHF: 9000, eqHG: 1,
               deEssF: 6800, deEssT: -30, deEssR: 8, excAmt: 12,
               compT: -20, compR: 4, compA: 3, compRel: 150, satD: 25, limC: -1, outGain: 1,
               bypass: { input: false, cleanup: false, gate: false, feedback: false, micfix: false,
                         eq: false, deess: false, exciter: false, comp: false, sat: false, limit: false, output: false } },
      tape:  { inGain: 2, gateT: -40, gateR: 2, hpfF: 60, micAmt: 60,
               eqLowF: 120, eqLowG: 3, eqM1F: 400, eqM1G: 1, eqM1Q: 0.8,
               eqM2F: 2500, eqM2G: -1, eqM2Q: 1, eqHF: 8000, eqHG: -3,
               deEssF: 7000, deEssT: -24, deEssR: 4, excAmt: 8,
               compT: -14, compR: 2.5, compA: 15, compRel: 300, satD: 65, limC: -1.5, outGain: 0,
               bypass: { input: false, cleanup: false, gate: false, feedback: false, micfix: false,
                         eq: false, deess: false, exciter: false, comp: false, sat: false, limit: false, output: false } }
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
      setHum("60"); // presets assume US mains
      refreshBypassButtons();
      S.rebuild();
      document.querySelectorAll(".preset").forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("data-preset") === name);
      });
    }

    /* ---------- meters + input analysis (per-frame) ---------- */
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
    function analyzeInput() {
      nodes.inAn.getFloatTimeDomainData(meterBuf);
      var peak = 0, tpeak = 0, sum = 0, sumSq = 0, n = meterBuf.length, i, j, k;
      for (i = 0; i < n; i++) {
        var s = meterBuf[i], a = Math.abs(s);
        if (a > peak) peak = a;
        sum += s; sumSq += s * s;
      }
      for (j = 0; j < n - 1; j++) {
        var d = (meterBuf[j + 1] - meterBuf[j]) / 4;
        for (k = 1; k < 4; k++) {
          var v = Math.abs(meterBuf[j] + d * k);
          if (v > tpeak) tpeak = v;
        }
      }
      if (peak > tpeak) tpeak = peak;
      return { peak: peak, tpeak: tpeak, rms: Math.sqrt(sumSq / n), dc: sum / n };
    }
    var specByte = null;
    function drawSpectrum() {
      var cv = $("specCanvas");
      if (!cv) return;
      var g = cv.getContext("2d");
      var W = cv.width, H = cv.height;
      if (!specByte || specByte.length !== nodes.specAn.frequencyBinCount) {
        specByte = new Uint8Array(nodes.specAn.frequencyBinCount);
      }
      nodes.specAn.getByteFrequencyData(specByte);
      var binHz = ctx.sampleRate / nodes.specAn.fftSize;
      var minF = 20, maxF = 20000;
      g.clearRect(0, 0, W, H);
      for (var x = 0; x < W; x++) {
        var f = minF * Math.pow(maxF / minF, x / W);
        var bin = Math.min(Math.floor(f / binHz), specByte.length - 1);
        var h = (specByte[bin] / 255) * H;
        g.fillStyle = "#59d6ff";
        g.fillRect(x, H - h, 1, h);
      }
      if (noiseProfile) {
        g.strokeStyle = "#ff9a3c"; g.lineWidth = 2; g.beginPath();
        for (var x2 = 0; x2 < W; x2 += 2) {
          var f2 = minF * Math.pow(maxF / minF, x2 / W);
          var bin2 = Math.min(Math.floor(f2 / binHz), noiseProfile.length - 1);
          var db = Math.max(-100, noiseProfile[bin2]);
          var y = H - ((db + 100) / 100) * H;
          if (x2 === 0) g.moveTo(x2, y); else g.lineTo(x2, y);
        }
        g.stroke();
      }
    }
    var bandFreq = null;
    function drawBands() {
      var cv = $("bandCanvas");
      if (!cv) return;
      var g = cv.getContext("2d");
      var W = cv.width, H = cv.height;
      if (!bandFreq || bandFreq.length !== nodes.specAn.frequencyBinCount) {
        bandFreq = new Float32Array(nodes.specAn.frequencyBinCount);
      }
      nodes.specAn.getFloatFrequencyData(bandFreq);
      var binHz = ctx.sampleRate / nodes.specAn.fftSize;
      var minF = 40, maxF = ctx.sampleRate / 2, bands = 64, b, i;
      g.clearRect(0, 0, W, H);
      for (b = 0; b < bands; b++) {
        var f0 = minF * Math.pow(maxF / minF, b / bands);
        var f1 = minF * Math.pow(maxF / minF, (b + 1) / bands);
        var i0 = Math.max(1, Math.floor(f0 / binHz));
        var i1 = Math.min(bandFreq.length - 1, Math.ceil(f1 / binHz));
        var pk = -120;
        for (i = i0; i <= i1; i++) if (bandFreq[i] > pk) pk = bandFreq[i];
        var h = Math.max(0, Math.min(1, (pk + 90) / 90)) * H;
        g.fillStyle = pk > -12 ? "#ff5a3c" : "#39c2ff";
        g.fillRect(b * W / bands, H - h, Math.max(1, W / bands - 1), h);
      }
    }

    // Per-frame control-rate work. Returns meter levels for the shell.
    function tick() {
      var inp = analyzeInput();
      var dIn = inp.peak <= 0.00001 ? -Infinity : 20 * Math.log10(inp.peak);
      var dOut = peakDb(nodes.outAn);
      var gr = (typeof nodes.comp.reduction === "number") ? -nodes.comp.reduction : 0;
      // downward expander, smooth logarithmic envelope; threshold from the noise print
      var levelDb = inp.rms <= 0.00001 ? -90 : 20 * Math.log10(inp.rms);
      var gratio = parseFloat($("gateR").value);
      var targetDb = levelDb >= gateThresholdDb ? 0 : -(gateThresholdDb - levelDb) * (1 - 1 / gratio);
      var dt = 1 / 60;
      var coef = targetDb > gateEnvDb ? 1 - Math.exp(-dt / 0.005) : 1 - Math.exp(-dt / 0.15);
      gateEnvDb += (targetDb - gateEnvDb) * coef;
      nodes.gateGain.gain.value = bypass.gate ? 1 : dbToGain(gateEnvDb);
      var rmsDb = inp.rms <= 0.00001 ? -90 : 20 * Math.log10(inp.rms);
      floorEnv += (rmsDb - floorEnv) * 0.03;
      $("noiseFloor").textContent = floorEnv.toFixed(1) + " dB";
      $("truePeak").textContent = inp.tpeak <= 0.00001 ? "-inf dBTP" :
        (20 * Math.log10(inp.tpeak)).toFixed(1) + " dBTP";
      if (inp.peak >= 0.999) clipLatched = true;
      var led = $("clipLed");
      led.textContent = clipLatched ? "CLIP" : "OK";
      led.classList.toggle("hot", clipLatched);
      var dcBad = Math.abs(inp.dc) > 0.02;
      var dcEl = $("dcLed");
      dcEl.textContent = dcBad ? "OFFSET" : "OK";
      dcEl.classList.toggle("hot", dcBad);
      drawSpectrum();
      drawBands();
      return { dIn: dIn, dOut: dOut, gr: gr };
    }

    /* ---------- noise print ---------- */
    var noiseFloorDb = -80;
    function captureNoisePrint() {
      var btn = $("noisePrintBtn");
      btn.disabled = true;
      $("noisePrintStatus").textContent = "Listening... stay quiet. Learning your room tone.";
      var frames = [], need = 30;
      var bins = nodes.specAn.frequencyBinCount;
      var tmp = new Float32Array(bins);
      var timer = setInterval(function () {
        nodes.specAn.getFloatFrequencyData(tmp);
        var copy = new Float32Array(bins);
        for (var i = 0; i < bins; i++) copy[i] = tmp[i] < -120 ? -120 : tmp[i];
        frames.push(copy);
        if (frames.length >= need) {
          clearInterval(timer);
          btn.disabled = false;
          finishNoisePrint(frames);
        }
      }, 50);
    }
    function finishNoisePrint(frames) {
      var bins = frames[0].length, f, i;
      var avg = new Float32Array(bins);
      for (i = 0; i < bins; i++) {
        var sum = 0;
        for (f = 0; f < frames.length; f++) sum += Math.pow(10, frames[f][i] / 10);
        avg[i] = 10 * Math.log10(sum / frames.length);
      }
      noiseProfile = avg;
      var sorted = Array.prototype.slice.call(avg).sort(function (a, b) { return a - b; });
      noiseFloorDb = sorted[Math.floor(sorted.length / 2)];
      var suggested = Math.max(-60, Math.min(0, Math.round(noiseFloorDb + 6)));
      var el = $("gateT");
      el.value = suggested;
      el.dispatchEvent(new Event("input"));
      $("gateSuggest").textContent =
        "Suggested from your noise print: " + suggested + " dB (floor " + noiseFloorDb.toFixed(1) + " dB).";
      $("noisePrintStatus").textContent =
        "Noise print captured. Orange line on the spectrum is your room. Expander threshold set to " + suggested + " dB.";
      sendStudioNoise();
    }

    /* ---------- feedback killer ---------- */
    function addNotch(freq, auto) {
      if (notchList.length >= 8) return;
      for (var i = 0; i < notchList.length; i++) {
        if (Math.abs(notchList[i].freq - freq) / freq < 0.05) return;
      }
      var flt = ctx.createBiquadFilter();
      flt.type = "notch"; flt.frequency.value = freq; flt.Q.value = 12;
      notchList.push({ freq: freq, node: flt, auto: !!auto });
      S.rebuild();
      renderNotches();
    }
    function removeNotch(i) {
      var w = notchList[i];
      try { w.node.disconnect(); } catch (e) {}
      notchList.splice(i, 1);
      S.rebuild();
      renderNotches();
    }
    function clearNotches() {
      while (notchList.length > 0) removeNotch(0);
    }
    function renderNotches() {
      var box = $("notchList");
      box.innerHTML = "";
      notchList.forEach(function (w, i) {
        var chip = document.createElement("span");
        chip.className = "chip" + (w.auto ? " auto" : "");
        chip.textContent = fmtHz(w.freq) + (w.auto ? " auto" : "");
        var x = document.createElement("button");
        x.textContent = "x"; x.className = "chip-x"; x.setAttribute("aria-label", "remove notch");
        x.addEventListener("click", function () { removeNotch(i); });
        chip.appendChild(x);
        box.appendChild(chip);
      });
      if (notchList.length === 0) {
        $("huntStatus").textContent = "No notches active. Scan room finds modal peaks below 300 Hz.";
      } else {
        $("huntStatus").textContent = notchList.length + " notch" +
          (notchList.length > 1 ? "es" : "") + " active.";
      }
    }
    function huntFeedback() {
      var btn = $("huntBtn");
      btn.disabled = true;
      $("huntStatus").textContent = "Hunting... let the ringing sustain for a second.";
      var snaps = [], bins = nodes.specAn.frequencyBinCount;
      function snap(i) {
        var d = new Float32Array(bins);
        nodes.specAn.getFloatFrequencyData(d);
        snaps.push(d);
        if (i < 2) { setTimeout(function () { snap(i + 1); }, 350); }
        else { finishHunt(snaps); btn.disabled = false; }
      }
      snap(0);
    }
    // Sabine US5245665A: feedback is a tone with constant frequency and growing
    // magnitude that lacks harmonics (voice/music are harmonically rich) and
    // persists across several FFT spectra.
    function finishHunt(snaps) {
      var bins = snaps[0].length;
      var binHz = ctx.sampleRate / nodes.specAn.fftSize;
      var cands = [], i, j;
      function cl(v) { return v < -120 ? -120 : v; }
      for (i = 4; i < bins - 4; i++) {
        var v0 = cl(snaps[0][i]), v1 = cl(snaps[1][i]), v2 = cl(snaps[2][i]);
        var sustained = Math.min(v0, v1, v2);
        if (sustained < -50) continue;
        if (!(v2 >= v0 - 1.5 && v1 >= v0 - 1.5)) continue;
        var b2 = Math.min(bins - 1, i * 2), b3 = Math.min(bins - 1, i * 3);
        if (cl(snaps[2][b2]) > sustained - 12 || cl(snaps[2][b3]) > sustained - 12) continue;
        var peak = true;
        for (j = 1; j <= 4; j++) {
          if (cl(snaps[0][i - j]) > v0 - 6 || cl(snaps[0][i + j]) > v0 - 6) { peak = false; break; }
        }
        if (!peak) continue;
        cands.push({ bin: i, mag: sustained });
      }
      cands.sort(function (a, b) { return b.mag - a.mag; });
      var picked = [];
      cands.forEach(function (c) {
        if (picked.length >= 6) return;
        if (picked.every(function (p) { return Math.abs(p.bin - c.bin) > 10; })) picked.push(c);
      });
      if (picked.length === 0) {
        $("huntStatus").textContent = "No sustained ringing found. The room is clean, or the tone moved.";
        return;
      }
      picked.forEach(function (c) { addNotch(c.bin * binHz, true); });
    }
    // Room-mode scan: cut narrow modal peaks below 300 Hz (narrower than
    // ~1/3 octave; peaks below 100 Hz always cut). Never boost nulls.
    function scanRoom() {
      var btn = $("roomScanBtn");
      btn.disabled = true;
      $("huntStatus").textContent = "Scanning room modes... keep quiet for a second.";
      var snaps = [], bins = nodes.specAn.frequencyBinCount;
      function snap(i) {
        var d = new Float32Array(bins);
        nodes.specAn.getFloatFrequencyData(d);
        snaps.push(d);
        if (i < 2) { setTimeout(function () { snap(i + 1); }, 350); }
        else { finishRoomScan(snaps); btn.disabled = false; }
      }
      snap(0);
    }
    function finishRoomScan(snaps) {
      var bins = snaps[0].length;
      var binHz = ctx.sampleRate / nodes.specAn.fftSize;
      var maxBin = Math.min(bins - 4, Math.floor(300 / binHz));
      var cands = [], i, j;
      function cl(v) { return v < -120 ? -120 : v; }
      for (i = 2; i < maxBin; i++) {
        var f = i * binHz;
        var v0 = cl(snaps[0][i]);
        var sustained = Math.min(v0, cl(snaps[1][i]), cl(snaps[2][i]));
        if (sustained < -55) continue;
        var peak = true;
        for (j = 1; j <= 4; j++) {
          if (cl(snaps[0][i - j]) > v0 - 6 || cl(snaps[0][i + j]) > v0 - 6) { peak = false; break; }
        }
        if (!peak) continue;
        var lo = i, hi = i;
        while (lo > 0 && cl(snaps[0][lo]) > v0 - 6) lo--;
        while (hi < bins - 1 && cl(snaps[0][hi]) > v0 - 6) hi++;
        if ((hi - lo) * binHz > f * 0.26) continue;
        cands.push({ freq: f, mag: sustained });
      }
      cands.sort(function (a, b) { return b.mag - a.mag; });
      var added = 0;
      cands.forEach(function (c) {
        if (added >= 4 || notchList.length >= 8) return;
        addNotch(c.freq, true);
        added++;
      });
      $("huntStatus").textContent = added > 0 ?
        added + " room mode" + (added > 1 ? "s" : "") + " notched." :
        "No narrow room modes found below 300 Hz.";
    }

    /* ---------- hum + studio cleanup ---------- */
    function setHum(sel) {
      humSel = sel;
      document.querySelectorAll(".humsel").forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("data-hum") === sel);
      });
      var base = sel === "50" ? 50 : 60;
      nodes.hum.forEach(function (n, i) { n.frequency.value = base * (i + 1); });
      S.rebuild();
    }
    function sendStudioConfig() {
      if (!nodes.studio) return;
      nodes.studio.port.postMessage({ type: "config", cfg: {
        nrOn: true,
        alpha: parseFloat($("nrAlpha").value),
        floorDb: parseFloat($("nrFloor").value),
        drvOn: true,
        drvAmt: parseFloat($("drvAmt").value) / 100,
        drvDecay: 0.93,
        shOn: true,
        atkDb: parseFloat($("atkSh").value),
        susDb: parseFloat($("susSh").value)
      }});
    }
    function sendStudioNoise() {
      if (!nodes.studio || !noiseProfile) return;
      nodes.studio.port.postMessage({
        type: "noise",
        mags: Array.from(noiseProfile),
        binHz: ctx.sampleRate / nodes.specAn.fftSize
      });
    }
    function setStudio(on) {
      var apply = function () {
        studioOn = on;
        var btn = $("studioToggle");
        btn.textContent = on ? "On" : "Off";
        btn.classList.toggle("active", on);
        if (on) { sendStudioConfig(); sendStudioNoise(); }
        S.rebuild();
        $("studioStatus").textContent = on ?
          "Studio cleanup in the chain." + (noiseProfile ? "" : " Capture a noise print for the NR stage.") :
          "Studio cleanup bypassed.";
      };
      if (on && !nodes.studio) {
        ctx.audioWorklet.addModule("cleanup-worklet.js").then(function () {
          nodes.studio = new AudioWorkletNode(ctx, "fif-cleanup");
          apply();
        }).catch(function () {
          $("studioStatus").textContent = "Worklet failed to load on this browser.";
        });
      } else {
        apply();
      }
    }

    /* ---------- instance ---------- */
    return {
      build: makeNodes,
      bind: bindAll,
      connect: connect,
      disconnect: disconnect,
      tick: tick,
      presets: function () { return PRESET_DEFS.slice(); },
      applyPreset: applyPreset
    };
  }
});
