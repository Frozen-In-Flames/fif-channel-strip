# Frozen In Flames Channel Strip

A virtual recording channel strip that runs entirely in your browser. Pick a chain on the startup screen, point it at your iPhone microphone or drop in an audio file, shape it through full DSP, watch the meters, and record the result as a WAV. No hardware, no server, no account.

Live demo: https://frozen-in-flames.github.io/fif-channel-strip/

## Product line, not a one-off

The app is built as a product line. The shell (audio engine start, sources, meters, recorder, WAV export) knows nothing about DSP. Every chain is a **suite** plugged in through a registry (`suites.js`): each suite carries its own name, description, stage list, and patent ledger reference, and appears as a choice on the startup screen. Adding a future suite means registering a new file. The shell is never touched.

The first suite in the registry is **Vocal Nine**, documented below.

## Philosophy

Understand the input before treating it. The app opens with diagnosis, then treats problems in signal order: measure the room, silence it, kill the ringing, fix the capsule, shape the tone, control the dynamics, tame the peaks.

## The Vocal Nine chain

Every stage can be bypassed independently. Signal order:

1. **Analyze** - 64-band real-time FFT spectrum, continuous spectrum display, true-peak readout, noise floor readout, clip indicator, DC-offset indicator. Shows what is wrong with the input before any processing touches it.
2. **Noise print** - capture 1.5 seconds of room tone. The app stores the per-band noise profile, draws it over the spectrum, and auto-suggests the expander threshold from it. This is how a noisy room gets measured instead of guessed at.
3. **Expander** - downward expander with a smooth logarithmic envelope and adjustable ratio. Quiets the room between phrases instead of chopping them. Threshold auto-suggested from the noise print.
4. **Feedback Killer** - hunts sustained ringing using the Sabine criteria (constant frequency, growing magnitude, no harmonics, persistent across spectra) and suppresses it with narrow automatic notch filters. Room scan finds modal peaks below 300 Hz. Manual notch add and clear included.
5. **Cleanup** - steep high-pass (40-220 Hz) against handling thumps and rumble, plus Q-30 hum notches at 50 or 60 Hz and harmonics.
6. **Mic Fix** - iPhone transducer correction: tames the harsh 3.3 kHz capsule resonance peak and restores 240 Hz chest body. Followed by the 4-band corrective EQ (low shelf, two peaking mids with Q, high shelf).
7. **De-esser** - split-band: compresses only the high band above 6.8 kHz, leaves the voice alone.
8. **Exciter** - high-passed sidechain through asymmetric saturation synthesizes 2nd and 3rd harmonics for air and presence.
9. **Dynamics** - compressor (threshold, ratio, attack, release, live gain-reduction meter), tanh saturation for body, and a 1 ms brickwall limiter that tames the harsh transient peaks cheap mics exaggerate.
10. **Studio Cleanup (toggle)** - deep spectral work in one STFT pass: noise reduction from your noise print (Novatel method), late-reverb suppression (Habets/Lebart exponential-decay model), and a dual-envelope transient shaper. Toggle-gated because it is heavy; the native chain above runs fine without it.
11. **Export** - the processed output records to 16-bit linear PCM WAV with a canonical 44-byte RIFF header, encoded on device.

Meters show input level, gain reduction, and output level in real time.

## Presets

- **Clean**: flat EQ, gentle compression, saturation off. A transparent starting point.
- **Vocal Punch**: high-passed lows, presence lift around 3 kHz, firm compression, a touch of drive.
- **Warm Tape**: boosted lows, rolled-off highs, soft compression, heavier saturation.

## Recording

Tap Record to capture the processed output. When you stop, the app encodes a 16-bit WAV on your device and offers it as a download. Nothing is uploaded anywhere.

## How each problem gets solved

- **Noisy room**: the noise print measures the room tone per frequency band, the expander quiets everything below it, the feedback killer removes sustained ringing, and Studio Cleanup subtracts the noise spectrum itself.
- **Cheap mic harshness**: the limiter tames exaggerated transient peaks, Mic Fix corrects the capsule resonance, the de-esser controls sibilance, the exciter restores harmonic life, and the EQ shapes the rest.
- **Room resonances**: the room scanner finds narrow modal peaks below 300 Hz and notches them; hum notches kill mains buzz.
- **Not knowing what is wrong**: the analyzer shows the 64-band spectrum, true peak, noise floor, clipping, and DC offset live, so every treatment decision is based on measured signal.
- **iOS constraints**: audio starts on an explicit tap (iOS requires a user gesture), the context resumes after calls and app switches, the silent-switch behavior is documented in the app, and the heavy STFT work sits behind a toggle so the native chain de-risks older phones.

## Patents

Every stage cites its sources in [PATENTS.md](PATENTS.md), the Vocal Nine patent ledger. The two highest-value methods (Sabine feedback detection, Novatel noise-print spectral reduction) are confirmed expired and implemented directly; still-active patents are learn-only and re-implemented originally.

## Roadmap

- v0.2: multiband dynamics, offline faster-than-real-time render, adaptive noise profiling.
- Research in progress: mic correction profiles from first principles, each integrated as a build stage when verified. New chains ship as new registry suites.

## Not affiliated with Focusrite

This project is not affiliated with, sponsored by, or endorsed by Focusrite. It takes no names, product names, or visual identity from Focusrite or its brands. Similar functionality, original identity.

## License

Apache-2.0. See LICENSE.
