# Vocal Nine and the shared processing conventions

This note records how the Vocal Nine chain in this app relates to the other
two Frozen In Flames processing layers that exist today: the Frozen In
Flames plugin and the Frozen In Flames Studio mixer. It is a conventions
document, not a code sharing claim. The three layers are separate codebases
in separate languages, and no DSP source is shared between them at the time
of writing. What they share is a set of processing decisions, listed below,
so that a setting learned in one layer reads the same way in another. The
plugin side of this convention is recorded in the plugin repository in
`docs/dsp-sharing.md`, and the two notes are counterparts.

## What is shared today

### Stage order philosophy

Each layer treats the signal in the same order of intent:

1. Measure first. Vocal Nine opens with its Analyze stage, which reports
   spectrum, true peak, noise floor, clipping, and DC offset before any
   treatment is applied. The plugin reports its state through its editor
   and metering, and the Studio mixer shows per stem levels, but the
   principle is the same across the family: diagnosis precedes treatment.
2. Correct before enhancing. Vocal Nine removes rumble, hum, and ringing,
   then corrects the transducer, and only then shapes tone. The plugin
   places a DC blocker after its saturation stage for the same reason: a
   defect introduced or carried by an earlier stage is cleaned up before
   later stages build on the signal.
3. Shape tone before dynamics. In Vocal Nine the corrective EQ sits ahead
   of the de-esser, the exciter, and the Dynamics stage. In the Studio
   mixer each stem carries a three band EQ (low, mid, high) ahead of its
   pan and gain staging.
4. Saturate late, and keep it optional. Vocal Nine applies tanh saturation
   inside its final Dynamics stage, after compression and before the
   limiter, and the stage ships bypassed in the Clean preset. The plugin
   treats saturation as its Fire half, a distinct stage with its own
   control set, and at zero Heat the Fire stage is bit transparent. In
   both layers saturation is a deliberate addition, never a default
   colouring that cannot be removed.
5. Limit last. Vocal Nine ends with a 1 ms brickwall limiter at a ceiling
   below full scale. The plugin ends its Fire path with a soft clip safety
   stage and a DC blocker. The Studio mixer ends at a master gain. Each
   layer reserves its final stage for peak control and level, not tone.

### Gain staging

* Levels are stated in decibels in every layer, and conversion between
  decibels and linear gain follows the same relation, 10 to the power of
  dB divided by 20. In this app that relation lives in `dsp-math.js` and
  is covered by the offline tests.
* Each stage is expected to be able to sit at unity. Vocal Nine presets
  keep trim and output at 0 dB unless a preset states otherwise, and the
  corrective EQ defaults to flat.
* Headroom is protected at the end of the chain rather than chased at
  every stage. Vocal Nine uses a limiter ceiling of -1 dB in its Clean and
  Vocal Punch presets. The plugin uses approximate loudness compensation
  as its Heat control rises, so raising saturation does not silently raise
  the output level by the same amount.
* Positive gain at rest is small and accounted for. In Vocal Nine the
  only positive gain in the default settings is the Mic Fix body lift,
  and the offline tests assert that total positive staging at rest stays
  within a stated bound.

### Saturation character

Vocal Nine saturation is a normalised tanh curve: full scale in gives
full scale out at any drive, and drive changes the curve shape rather
than the output ceiling. The plugin Fire stage offers four saturation
models instead of one curve, but follows the same rule in spirit: each
model returns roughly full scale for full scale input, it runs
oversampled so generated harmonics do not fold back as aliasing, and a
safety stage closes the path. The Studio mixer does not saturate its
stems; saturation in the family lives in the channel strip and the
plugin, and the mixer is a level, EQ, pan, and space layer.

### Spectral work

Vocal Nine keeps its heavy spectral work behind one toggle, the Studio
Cleanup stage, which performs noise reduction, late reverb suppression,
and transient shaping in a single STFT pass. The plugin Ice half is a
spectral process as well, a phase vocoder freeze, and it is likewise a
distinct stage with its own controls rather than a permanent part of the
path. The shared convention is placement and honesty: spectral processing
is named, separately controlled, and bypassable in both layers.

## What is not shared

* No code. The channel strip is plain JavaScript on Web Audio nodes, the
  plugin is C++, and the Studio mixer is TypeScript on Web Audio nodes.
  Conventions are matched by hand and checked by each layer's own tests.
* No presets. Preset names and values are local to each layer, because
  the controls they set do not exist in the other layers.
* No parameter automation or session format crosses between the layers.

## Keeping the convention

When a change in one layer alters stage order, the decibel convention, or
the role of the final stage, the change belongs in this note and in the
counterpart note in the plugin repository in the same round of work, so
the two documents never describe different families.
