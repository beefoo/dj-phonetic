class AudioReverbFilter {
  constructor(options = {}) {
    const defaults = {
      bypass: false,
      context: false,
      dryLevel: 1,
      highCut: 22050,
      impulse: 'audio/impulses/ir_rev_short.wav',
      level: 1,
      lowCut: 20,
      wetLevel: 1,
    };
    this.options = _.extend({}, defaults, options);
  }

  load() {
    const readyPromise = $.Deferred();
    const userContext = this.options.context ? this.options.context : new AudioContext();

    this.input = userContext.createGain();
    this.convolver = userContext.createConvolver();
    this.dry = userContext.createGain();
    this.filterLow = userContext.createBiquadFilter();
    this.filterHigh = userContext.createBiquadFilter();
    this.wet = userContext.createGain();
    this.output = userContext.createGain();

    this.input.connect(this.filterLow);
    this.input.connect(this.dry);
    this.filterLow.connect(this.filterHigh);
    this.filterHigh.connect(this.convolver);
    this.convolver.connect(this.wet);
    this.wet.connect(this.output);
    this.dry.connect(this.output);

    this.dry.gain.value = this.options.dryLevel;
    this.wet.gain.value = this.options.wetLevel;
    this.filterHigh.frequency.value = this.options.highCut;
    this.filterLow.frequency.value = this.options.lowCut;
    this.output.gain.value = this.options.level;
    this.filterHigh.type = 'lowpass';
    this.filterLow.type = 'highpass';
    this.bypass = this.options.bypass;

    fetch(this.options.impulse).then((response) => response.arrayBuffer()).then((audioData) => {
      userContext.decodeAudioData(audioData).then((buffer) => {
        this.convolver.buffer = buffer;
        readyPromise.resolve();
      });
    });

    return readyPromise;
  }
}
