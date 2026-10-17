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
