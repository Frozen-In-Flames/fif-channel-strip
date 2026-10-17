/*
 * FIF Studio Cleanup worklet.
 *
 * One STFT pass hosting three treatments:
 *  - Spectral noise reduction after Novatel US5432859A (expired ~2013):
 *    per-bin noise profile from the captured noise print,
 *    clean = mag - alpha * noise_est, spectral floor -11..-20 dB,
 *    attack/release gain smoothing to kill musical noise.
 *  - Late-reverb suppression after the Habets/Lebart exponential-decay model:
 *    predict late-reverb PSD from past frames, subtract. No room IR needed.
 *  - Dual-envelope transient shaper:
 *    gain = 1 + attack*(fastEnv - slowEnv) + sustain*slowEnv.
 *
 * N=1024, hop=256 (75% overlap), sqrt-Hann analysis and synthesis windows
 * (product sums to 1.5, normalized on emit). Toggle-gated by the app:
 * heavy by design, so it stays off until the user enables it.
 */
class FIFCleanup extends AudioWorkletProcessor {
  constructor() {
    super();
    this.N = 1024;
    this.hop = 256;
    this.half = 512;
    this.win = new Float32Array(this.N);
    for (let i = 0; i < this.N; i++) {
      this.win[i] = Math.sqrt(0.5 * (1 - Math.cos(2 * Math.PI * i / this.N)));
    }
    this.OLA_NORM = 1.5;
    // bit-reversal table for radix-2 FFT
    this.rev = new Uint16Array(this.N);
    for (let i = 0; i < this.N; i++) {
      let r = 0;
      for (let b = 0; b < 10; b++) r |= ((i >> b) & 1) << (9 - b);
      this.rev[i] = r;
    }
    this.re = new Float32Array(this.N);
    this.im = new Float32Array(this.N);
    this.frameOut = new Float32Array(this.N);
    this.hist = new Float32Array(this.N);
    this.histPos = 0;
    this.outAcc = new Float32Array(this.N);
    this.pend = new Float32Array(8192);
    this.pendR = 0;
    this.pendW = 0;
    this.gainSm = new Float32Array(this.half + 1).fill(1);
    this.revEst = new Float32Array(this.half + 1);
    this.noiseMag = null;
    this.winSum = 0;
    for (let i = 0; i < this.N; i++) this.winSum += this.win[i];
    this.fast = 0;
    this.slow = 0;
    this.cA = 1 - Math.exp(-this.hop / (sampleRate * 0.010));
    this.cR = 1 - Math.exp(-this.hop / (sampleRate * 0.080));
    this.p = { nrOn: true, alpha: 1.4, floorDb: -15,
               drvOn: true, drvAmt: 0.5, drvDecay: 0.93,
               shOn: true, atkDb: 6, susDb: 0 };
    this.port.onmessage = (e) => {
      const d = e.data || {};
      if (d.type === "config" && d.cfg) Object.assign(this.p, d.cfg);
      if (d.type === "noise" && d.mags) this.setNoise(d.mags, d.binHz);
    };
  }

  setNoise(mags, binHz) {
    // Noise print comes from the app's AnalyserNode (dB per bin, its own FFT
    // size). Convert to linear magnitudes normalized like a full-scale sine
    // ~= 0 dB, and correct broadband-noise level for the bin-width difference.
    const out = new Float32Array(this.half + 1);
    const binW = sampleRate / this.N;
    const sizeCorr = 10 * Math.log10(binW / binHz);
    for (let k = 0; k <= this.half; k++) {
      const f = k * binW;
      const idx = Math.max(0, Math.min(mags.length - 1, Math.round(f / binHz)));
      out[k] = Math.pow(10, (Math.max(-120, mags[idx]) + sizeCorr) / 20);
    }
    this.noiseMag = out;
  }

  fft(re, im, inverse) {
    const N = this.N;
    for (let i = 0; i < N; i++) {
      const j = this.rev[i];
      if (j > i) {
        let t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }
    for (let len = 2; len <= N; len *= 2) {
      const ang = (inverse ? 2 : -2) * Math.PI / len;
      const wbR = Math.cos(ang), wbI = Math.sin(ang);
      for (let i = 0; i < N; i += len) {
        let wr = 1, wi = 0;
        for (let j = 0; j < len / 2; j++) {
          const xr = re[i + j + len / 2], xi = im[i + j + len / 2];
          const tr = wr * xr - wi * xi, ti = wr * xi + wi * xr;
          re[i + j + len / 2] = re[i + j] - tr;
          im[i + j + len / 2] = im[i + j] - ti;
          re[i + j] += tr; im[i + j] += ti;
          const nwr = wr * wbR - wi * wbI;
          wi = wr * wbI + wi * wbR; wr = nwr;
        }
      }
    }
    if (inverse) {
      const s = 1 / N;
      for (let i = 0; i < N; i++) { re[i] *= s; im[i] *= s; }
    }
  }

  frame(x) {
    const N = this.N, H2 = this.half, p = this.p;
    const re = this.re, im = this.im;
    for (let i = 0; i < N; i++) { re[i] = x[i] * this.win[i]; im[i] = 0; }
    this.fft(re, im, false);
    const floorLin = Math.pow(10, p.floorDb / 20);
    for (let k = 0; k <= H2; k++) {
      const a = re[k], b = im[k];
      const mag = Math.sqrt(a * a + b * b);
      const power = mag * mag;
      // normalize like the AnalyserNode scale: full-scale sine ~= 0 dB
      const magN = mag * 2 / this.winSum;
      let g = 1;
      if (p.nrOn && this.noiseMag) {
        const clean = Math.max(magN - p.alpha * this.noiseMag[k], magN * floorLin);
        const target = clean / (magN + 1e-9);
        const prev = this.gainSm[k];
        const gs = prev + (target - prev) * (target < prev ? this.cA : this.cR);
        this.gainSm[k] = gs;
        g *= gs;
      }
      if (p.drvOn) {
        const rev = this.revEst[k];
        const direct = Math.max(power - p.drvAmt * rev, power * 0.05);
        g *= Math.sqrt(direct / (power + 1e-12));
        this.revEst[k] = Math.max(p.drvDecay * rev, power);
      }
      re[k] = a * g; im[k] = b * g;
      if (k > 0 && k < H2) { re[N - k] = a * g; im[N - k] = -(b * g); }
    }
    this.fft(re, im, true);
    const atkF = Math.pow(10, p.atkDb / 20) - 1;
    const susF = Math.pow(10, p.susDb / 20) - 1;
    const cFa = 1 - Math.exp(-1 / (sampleRate * 0.001));
    const cSa = 1 - Math.exp(-1 / (sampleRate * 0.015));
    const cRl = 1 - Math.exp(-1 / (sampleRate * 0.020));
    const y = this.frameOut;
    for (let i = 0; i < N; i++) {
      let s = re[i] * this.win[i];
      if (p.shOn) {
        const ab = Math.abs(s);
        this.fast += (ab - this.fast) * (ab > this.fast ? cFa : cRl);
        this.slow += (ab - this.slow) * (ab > this.slow ? cSa : cRl);
        let gg = 1 + atkF * (this.fast - this.slow) + susF * this.slow;
        if (gg < 0.05) gg = 0.05; else if (gg > 8) gg = 8;
        s *= gg;
      }
      y[i] = s;
    }
    return y;
  }

  process(inputs, outputs) {
    const inp = inputs[0] && inputs[0][0];
    const outp = outputs[0] && outputs[0][0];
    if (!inp || !outp) return true;
    const N = this.N, H = this.hop, L = inp.length;
    let r = 0;
    while (r < L) {
      const take = Math.min(H - this.histPos, L - r);
      this.hist.copyWithin(0, take);
      this.hist.set(inp.subarray(r, r + take), N - take);
      this.histPos += take; r += take;
      if (this.histPos >= H) {
        this.histPos -= H;
        const fo = this.frame(this.hist);
        for (let i = 0; i < N; i++) this.outAcc[i] += fo[i];
        for (let i = 0; i < H; i++) this.pend[this.pendW++] = this.outAcc[i] / this.OLA_NORM;
        this.outAcc.copyWithin(0, H);
        this.outAcc.fill(0, N - H, N);
      }
    }
    for (let i = 0; i < L; i++) {
      outp[i] = (this.pendR < this.pendW) ? this.pend[this.pendR++] : 0;
    }
    if (this.pendR > 4096) {
      this.pend.copyWithin(0, this.pendR, this.pendW);
      this.pendW -= this.pendR; this.pendR = 0;
    }
    return true;
  }
}
registerProcessor("fif-cleanup", FIFCleanup);
