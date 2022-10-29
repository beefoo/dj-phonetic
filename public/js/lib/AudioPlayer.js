class AudioPlayer {
  constructor(options = {}) {
    const defaults = {
      fadeIn: 0.025,
      fadeOut: 0.025,
      reverb: 0.5,
      reverbImpulse: 'js/vendor/tuna/ir_rev_short.wav',
    };
    this.options = _.extend({}, defaults, options);
    this.init();
  }

  init() {
    this.ctx = new AudioContext();
    this.effectNode = this.loadEffects();
    this.destination = this.effectNode;
    this.loadedId = false;
    this.isLoading = false;
  }

  loadEffects() {
    const { ctx } = this;
    const { reverb, reverbImpulse } = this.options;
    const tuna = new Tuna(ctx);
    const effectNode = new tuna.Convolver({
      impulse: reverbImpulse,
      wetLevel: reverb,
    });
    effectNode.connect(ctx.destination);
    return effectNode;
  }

  loadFromURL(url) {
    const loadPromise = $.Deferred();
    if (url === this.loadedId) return loadPromise.resolve(url).promise();
    this.isLoading = true;

    fetch(url).then((response) => response.arrayBuffer()).then((audioData) => {
      this.ctx.decodeAudioData(audioData).then((buffer) => {
        this.audioBuffer = buffer;
        this.loadedId = url;
        this.isLoading = false;
        loadPromise.resolve(url);
      });
    });

    return loadPromise;
  }

  play(start, end) {
    if (this.isLoading || this.loadedId === false) return;
    const { fadeIn, fadeOut } = this.options;
    const { ctx } = this;
    const dur = end - start + fadeIn + fadeOut;
    const offsetStart = Math.max(0, start - fadeIn);
    const audioSource = ctx.createBufferSource();
    const gainNode = ctx.createGain();
    const now = ctx.currentTime;

    // set audio buffer
    audioSource.buffer = this.audioBuffer;

    // fade in
    gainNode.gain.setValueAtTime(Number.EPSILON, now);
    gainNode.gain.exponentialRampToValueAtTime(1, now + fadeIn);
    // fade out
    gainNode.gain.setValueAtTime(1, now + dur - fadeOut);
    gainNode.gain.exponentialRampToValueAtTime(Number.EPSILON, now + dur);

    // connect and play
    audioSource.connect(gainNode);
    gainNode.connect(this.destination);
    audioSource.start(0, offsetStart, dur);
  }
}
