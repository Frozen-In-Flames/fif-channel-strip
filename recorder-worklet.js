// FIF Channel Strip recorder worklet: captures post-output mono samples.
class FIFRecorder extends AudioWorkletProcessor {
  constructor() {
    super();
    this.recording = false;
    this.port.onmessage = (e) => {
      if (e.data && typeof e.data.recording === "boolean") {
        this.recording = e.data.recording;
      }
    };
  }
  process(inputs) {
    if (this.recording && inputs.length > 0 && inputs[0].length > 0) {
      // Copy channel 0 (mono sum is fine; chain is mono).
      this.port.postMessage({ samples: inputs[0][0].slice(0) });
    }
    return true;
  }
}
registerProcessor("fif-recorder", FIFRecorder);
