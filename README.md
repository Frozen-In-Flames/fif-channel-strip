# Frozen In Flames Channel Strip

A virtual recording channel strip that runs entirely in your browser. Point it at your iPhone microphone or drop in an audio file, shape it through a full processing chain, watch the meters, and record the result as a WAV. No hardware, no server, no account.

Live demo: https://frozen-in-flames.github.io/fif-channel-strip/

## The chain

Every stage can be bypassed independently. Signal order:

1. **Input** - input gain, -24 to +24 dB
2. **EQ** - 4-band parametric: low shelf, two peaking mids (with Q), high shelf
3. **Compressor** - threshold, ratio, attack, release, with a live gain-reduction meter
4. **Saturation** - tanh waveshaper with drive control, for warmth and grit
5. **Limiter** - brickwall ceiling, catches anything the chain pushes too hot
6. **Output** - output gain, -24 to +24 dB

Meters show input level, gain reduction, and output level in real time.

## Presets

- **Clean**: flat EQ, gentle compression, saturation off. A transparent starting point.
- **Vocal Punch**: high-passed lows, presence lift around 3 kHz, firm compression, a touch of drive.
- **Warm Tape**: boosted lows, rolled-off highs, soft compression, heavier saturation.

## Recording

Tap Record to capture the processed output. When you stop, the app encodes a 16-bit WAV on your device and offers it as a download. Nothing is uploaded anywhere.

## Honest limits

- **Latency**: this runs in the browser's Web Audio API, not native CoreAudio. Expect higher round-trip latency than a hardware interface or a native app. It is fine for tracking with effects and for processing files; it is not a replacement for a low-latency monitoring rig.
- **iOS Safari specifics**: audio starts only after you tap the start button (iOS requires a user gesture). Microphone access needs HTTPS, which the live demo has. Some iOS audio constraints (echo cancellation etc.) are requested off, but Safari may not honor every constraint.
- **Microphone quality**: the iPhone's built-in mics are good for sketches, demos, and ideas. They are not a substitute for a real interface and a real microphone when fidelity matters.
- **File support**: decoded with the browser's built-in decoders. WAV, MP3, and M4A work; odd formats may not.

## Not affiliated with Focusrite

This project is not affiliated with, sponsored by, or endorsed by Focusrite. It takes no names, product names, or visual identity from Focusrite or its brands. Similar functionality, original identity.

## License

Apache-2.0. See LICENSE.
