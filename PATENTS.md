# Patent Ledger: Vocal Nine Suite

Every DSP stage in the Vocal Nine suite is mapped to the patents and prior art
it learns from. Status notes use the US 20-year-from-filing rule (the two key
know-how patents were confirmed expired on Google Patents during research).

**Disclaimer: this is research, not legal advice. Verify status with counsel
before shipping.**

## Free to implement (expired)

| Stage | Patent / source | What it teaches | Status |
|---|---|---|---|
| Feedback detection | US5245665A, Sabine Musical Mfg. (1993) | Feedback is a tone with constant frequency and growing magnitude, lacks harmonics (voice/music is harmonically rich), must persist across several FFT spectra. Our detector implements exactly this. | Expired 2010, confirmed live |
| Noise-print spectral NR | US5432859A, Novatel (1995) | STFT, per-bin noise profile from a silent sample, clean = mag minus alpha x noise_est, spectral floor -11 to -20 dB, attack/release gain smoothing against musical noise. Our Studio Cleanup NR implements this. | Expired ~2013, confirmed live |
| Notch feedback suppression | US4088835A, Rauland-Borg (1978) | Narrow notch filters placed on feedback frequencies in installed sound systems. | Expired 1995 |
| Spectral subtraction (foundation) | US4185168, Boll | The foundational spectral-subtraction method our NR builds on. | Expired |
| Spectral subtraction | US4628529, Sony | Spectral subtraction for noise reduction. | Expired |
| Feedback suppression | US5640457 | Feedback suppression know-how, alongside the Sabine patent. | Expired |
| Expander / gate | US3989897, dbx | Downward expansion / gating dynamics. | Expired |
| Expander / gate | US4034299 | Expander/gate dynamics. | Expired |
| Spectral analysis / peak | US5465302 | Spectral analysis and peak detection know-how behind the analyzer. | Expired |
| Spectral analysis / peak | US6173059 | Spectral analysis and peak detection know-how behind the analyzer. | Expired |
| Transducer correction | US6072879 | Correcting transducer (mic capsule) frequency-response deviations. Our Mic Fix (3.3 kHz resonance cut, 240 Hz body) follows this approach. | Expired |
| De-esser | US4464785, Orban | De-essing dynamics. Our split-band de-esser is an original native-node design. | Expired |
| Limiter | US3258534, Fairchild | Peak limiting. Our 1 ms brickwall limiter is a DynamicsCompressorNode design. | Expired |
| Aural exciter | US4150253, Aphex | Harmonic synthesis via nonlinear processing (the aural exciter). | Expired |
| Aural exciter | US3978282 | Aural exciter harmonic synthesis. Our exciter uses an original asymmetric-saturation curve. | Expired |

## Implementation mapping: which method step each build choice came from

- **Feedback detection (Sabine US5245665A).** The patent's detector: FFT successive
  spectra, find the max-magnitude bin, test it against its harmonics/subharmonics
  by a factor (feedback has no harmonics; voice/music does), require persistence
  across N successive spectra, then place a programmable narrow notch.
  Our `finishHunt`: three FFT snapshots 350 ms apart; candidate bin must hold
  level across all three (persistence), must not decay (growing magnitude:
  v2 >= v0 - 1.5 dB), and bins at 2f and 3f must sit at least 12 dB below the
  candidate (harmonic-richness discrimination). Narrow local-maximum contrast
  check mirrors the patent's peak isolation. Placement: Q=12 biquad notches
  (Rauland-Borg US4088835A).
- **Live notch steering.** The patent's floating filters re-deploy to new
  detections. Our pool: a fresh detection within 8% of an existing auto notch
  retunes that filter live via `setTargetAtTime`; when the 8-filter pool is full,
  the oldest auto notch is recycled to the new frequency (dbx-style dynamic
  filter recycling). Manual notches are never moved.
- **Noise print (Boll US4185168 + Novatel US5432859A).** Boll: average spectral
  magnitudes over the silence sample. Novatel: per-bin noise profile via
  exponential averaging during speech-absent intervals. Our `finishNoisePrint`:
  per-bin exponential averaging (alpha 0.15) of linear spectral magnitudes over
  the 1.5 s capture. Deviation: Novatel gates the averaging with a VAD
  (per-bin SNR ratio vs threshold) for continuous adaptation; we capture on
  demand instead (documented, v0.2 roadmap: adaptive profiling).
- **Spectral NR (Novatel US5432859A).** The patent: per-bin gains from the noise
  profile, over-subtraction, empirical spectral floor (-11 dB, range -6 to -20),
  temporal gain smoothing against flutter. Our worklet: per-bin
  `clean = mag - alpha * noise_est`, floor -15 dB (slider -20 to -11),
  per-bin gain smoothing with 10 ms attack / 80 ms release coefficients.
  Implemented in one STFT pass (1024-pt, hop 256, sqrt-Hann analysis/synthesis).
- **Expander (dbx US3989897).** The patent family: RMS envelope detector driving a
  logarithmic gain law. Our expander: RMS level from the input analyser,
  gain computed in the dB domain (`-(threshold - level) * (1 - 1/ratio)`),
  smoothed with fast-attack (5 ms) / slow-release (150 ms) envelope so the gain
  never steps (no clicking). Threshold auto-derived from the noise print
  (floor + 6 dB).
- **Transducer correction (US6072879).** Corrective EQ against measured capsule
  deviations. Our Mic Fix: -6 dB peaking cut at the 3.3 kHz capsule resonance
  (Q=2) plus +3 dB at 240 Hz for chest body (Q=1), morphed by one amount control.
  Mic-modeling in the Antares style is first-principles only (no confirmed
  patent number to follow or avoid).
- **De-esser (Orban US4464785).** Split-band dynamics on the sibilance band.
  Our design: 6.8 kHz crossover, fast compressor (2 ms attack) on the high band
  only, dry low band untouched. Original native-node topology.
- **Limiter (Fairchild US3258534).** Brickwall peak limiting. Ours: 20:1
  DynamicsCompressorNode, 1 ms attack, hard knee, ceiling control.
- **Exciter (Aphex US4150253 / US3978282).** Harmonic synthesis via nonlinear
  processing. Ours: high-passed (3 kHz) sidechain through an asymmetric tanh
  waveshaper (different positive/negative drive, generating 2nd and 3rd
  harmonics), blended under the dry signal. Original curve design.
- **Spectrum / peak analysis (US5465302 / US6173059).** Know-how behind the
  64-band log-spaced peak bars, true-peak (4x interpolated) readout, and clip
  detection.
- **Late-reverb suppression.** Habets/Lebart exponential-decay model from
  academic literature (no patent followed): per-bin late-reverb PSD predicted
  from past frames via leaky integration, subtracted from the power spectrum.
  Implemented originally.
- **Transient shaper.** Dual-envelope-follower concept (SPL differential
  envelope), implemented originally:
  `gain = 1 + attack*(fastEnv - slowEnv) + sustain*slowEnv`.

## Documented deviations (approximations, with reasons)

1. Novatel's VAD-gated continuous profile adaptation is replaced by on-demand
   1.5 s capture (iOS CPU budget; adaptive profiling is v0.2).
2. The worklet STFT runs at 1024-pt / 256-hop instead of Novatel's sliding DFT;
   equivalent per-bin math, coarser time resolution (iOS 128-sample quantum).
3. Sabine's programmable-filter hardware becomes BiquadFilterNode notches;
   same detection math, same placement logic.
4. Still-active patents (Bose US9351072B2, US7917359B2, US8265292B2) are
   learn-only; the corresponding features are original implementations.

## Learn only: re-implemented originally (still active)

These were studied for know-how only. Nothing is copied; the implementations are
original work.

| Patent | Holder | Area | Active until |
|---|---|---|---|
| US9351072B2 | Bose | Multi-band harmonic discrimination for feedback suppression | ~2033 |
| US7917359B2 | undisclosed | Single-mic irregular-noise suppression | ~2028 |
| US8265292B2 | Microsoft | Event-triggered cancellation with stored noise templates | ~2028 |

## Presumed expired (~2020, verify filing dates)

- US7613529B1, Harman (AFS-family feedback elimination)
- US6459914B1 (spectral subtraction with SNR-based gain averaging)

## First principles / academic literature

- **Mic modeling:** no Antares spectral-shaping patent number could be confirmed, so mic correction is implemented from first principles (measured capsule behavior: 3.3 kHz resonance peak, thin low end) rather than from any vendor's method.
- **Late-reverb suppression:** Habets/Lebart exponential-decay model (academic literature), implemented originally in the Studio Cleanup worklet.
- **Transient shaper:** dual-envelope-follower design (SPL differential-envelope concept), implemented originally.
- **Room modes:** narrow parametric cuts equal-and-opposite to modal peaks, never boosting nulls; standard acoustic practice.
- **Hum notches, HPF, corrective EQ, tanh saturation, compressor/limiter via DynamicsCompressorNode:** long-expired textbook DSP and native Web Audio nodes.

## Per-suite ledgers

Each suite in the registry carries its own patent ledger reference. This file is
the ledger for the Vocal Nine suite (`vocal-nine`). Future suites ship their own.
