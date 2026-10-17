# Frozen In Flames Channel Strip

A virtual recording channel strip that runs entirely in your browser. Point it at your iPhone microphone or drop in an audio file, shape it through a full processing chain, watch the meters, and record the result as a WAV. No hardware, no server, no account.

Live demo: https://frozen-in-flames.github.io/fif-channel-strip/

## Philosophy

Understand the input before treating it. The app opens with diagnosis, then treats problems in signal order: silence the room, kill the ringing, shape the tone, control the dynamics, tame the peaks.

## The chain

Every stage can be bypassed independently. Signal order:

1. **Analyze** - real-time FFT spectrum display, noise floor readout, clip indicator, DC-offset indicator. Shows what is wrong with the input before any processing touches it.
2. **Noise print** - capture 1.5 seconds of room tone. The app stores the per-band noise profile, draws it over the spectrum, and auto-suggests the gate threshold from it. This is how a noisy room gets measured instead of guessed at.
3. **Gate** - silences the chain when the signal drops below the threshold, so room tone and hiss disappear between phrases. Threshold auto-suggested from the noise print.
4. **Feedback Killer** - hunts sustained ringing and resonant frequencies in the live input and suppresses them with narrow automatic notch filters. Manual notch add and clear included.
5. **Input** - input gain, -24 to +24 dB.
6. **EQ** - 4-band parametric: low shelf, two peaking mids (with Q), high shelf. Shapes tone and corrects cheap-mic harshness.
7. **Compressor** - threshold, ratio, attack, release, with a live gain-reduction meter.
8. **Saturation** - tanh waveshaper with drive control, for warmth and grit.
9. **Limiter** - brickwall ceiling. Tames the harsh transient peaks cheap mics exaggerate.
10. **Output** - output gain, -24 to +24 dB.

Meters show input level, gain reduction, and output level in real time.

## Presets

- **Clean**: flat EQ, gentle compression, saturation off. A transparent starting point.
- **Vocal Punch**: high-passed lows, presence lift around 3 kHz, firm compression, a touch of drive.
- **Warm Tape**: boosted lows, rolled-off highs, soft compression, heavier saturation.

## Recording

Tap Record to capture the processed output. When you stop, the app encodes a 16-bit WAV on your device and offers it as a download. Nothing is uploaded anywhere.

## How each problem gets solved

- **Noisy room**: the noise print measures the room tone per frequency band, the gate silences everything below it, and the feedback killer removes sustained ringing. Full spectral subtraction using the stored print ships in v0.2.
- **Cheap mic harshness**: the limiter tames exaggerated transient peaks, the EQ corrects the tonal balance, and a de-esser stage ships in v0.2.
- **Not knowing what is wrong**: the analyzer shows the spectrum, noise floor, clipping, and DC offset live, so every treatment decision is based on measured signal.
- **iOS constraints**: audio starts on an explicit tap (iOS requires a user gesture), and the app runs over HTTPS so microphone access works.

## Roadmap

- v0.2: full spectral noise subtraction driven by the stored noise print, de-esser stage, mic correction profiles.
- Research in progress: feedback suppression techniques, spectral noise reduction methods, and mic correction, each integrated as a build stage when verified.

## Not affiliated with Focusrite

This project is not affiliated with, sponsored by, or endorsed by Focusrite. It takes no names, product names, or visual identity from Focusrite or its brands. Similar functionality, original identity.

## License

Apache-2.0. See LICENSE.
