class AudioPlayer {
  constructor(options = {}) {
    const defaults = {
      fadeIn: 0.025,
      fadeOut: 0.025,
      filters: {},
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
    this.queue = [];
    this.loadFilters(this.options.filters);
  }

  static getReversedAudioBuffer(audioBuffer, audioContext) {
    const { numberOfChannels } = audioBuffer;

    // create the new AudioBuffer
    const newBuffer = audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate,
    );

    // copy the cloned arrays to the new AudioBuffer
    for (let i = 0; i < numberOfChannels; i += 1) {
      const newChannel = new Float32Array(audioBuffer.getChannelData(i));
      Array.prototype.reverse.call(newChannel);
      newBuffer.getChannelData(i).set(newChannel);
    }

    return newBuffer;
  }

  createFilter(params) {
    const filter = this.ctx.createBiquadFilter();
    filter.type = params.type;
    if (_.has(params, 'frequency')) filter.frequency.value = params.frequency;
    if (_.has(params, 'gain')) filter.gain.value = params.gain;
    return filter;
  }

  createFilterChain(params) {
    if (params.length <= 0) return false;
    const lastParamIndex = params.length - 1;
    const filters = [];
    params.forEach((param, i) => {
      const filter = this.createFilter(param);
      filters.push(filter);
      if (i > 0) {
        filters[i - 1].connect(filters[i]);
      }
      if (i === lastParamIndex) filters[i].connect(this.destination);
    });
    return filters[0];
  }

  isReady() {
    return !this.isLoading && this.loadedId !== false;
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

  loadFilters(filters) {
    this.filters = {};
    _.each(filters, (filterParams, key) => {
      this.filters[key] = this.createFilterChain(filterParams);
    });
  }

  loadFromURL(url) {
    const loadPromise = $.Deferred();
    if (url === this.loadedId) return loadPromise.resolve(url).promise();
    this.isLoading = true;

    fetch(url).then((response) => response.arrayBuffer()).then((audioData) => {
      this.ctx.decodeAudioData(audioData).then((buffer) => {
        this.audioBuffer = buffer;
        this.audioBufferReversed = this.constructor.getReversedAudioBuffer(buffer, this.ctx);
        this.loadedId = url;
        this.isLoading = false;
        loadPromise.resolve(url);
      });
    });

    return loadPromise;
  }

  play(start, end, when = 0, volume = 1, reverse = false, filterName = false) {
    if (!this.isReady()) return;
    const { fadeIn, fadeOut } = this.options;
    const { ctx } = this;
    const dur = end - start + fadeIn + fadeOut;
    let offsetStart = Math.max(0, start - fadeIn);
    if (reverse) {
      offsetStart = this.audioBufferReversed.duration - offsetStart - dur;
    }
    const audioSource = ctx.createBufferSource();
    const gainNode = ctx.createGain();
    const now = ctx.currentTime;

    // set audio buffer
    if (reverse) audioSource.buffer = this.audioBufferReversed;
    else audioSource.buffer = this.audioBuffer;

    // fade in
    gainNode.gain.setValueAtTime(Number.EPSILON, now);
    gainNode.gain.exponentialRampToValueAtTime(volume, now + fadeIn);
    // fade out
    gainNode.gain.setValueAtTime(volume, now + dur - fadeOut);
    gainNode.gain.exponentialRampToValueAtTime(Number.EPSILON, now + dur);

    // connect and play
    audioSource.connect(gainNode);
    if (filterName && _.has(this.filters, filterName) && this.filters[filterName] !== false) {
      gainNode.connect(this.filters[filterName]);
    } else {
      gainNode.connect(this.destination);
    }
    audioSource.start(when, offsetStart, dur);
  }

  schedule(id, when, task) {
    if (when <= 0) task();

    const now = this.ctx.currentTime;
    this.queue.push({
      id,
      task,
      when: when + now,
    });
  }

  update() {
    if (this.queue.length <= 0 || !this.isReady()) return;
    const idsToRemove = [];
    const now = this.ctx.currentTime;
    this.queue.forEach((item) => {
      if (item.when <= now) {
        item.task();
        idsToRemove.push(item.id);
      }
    });
    if (idsToRemove.length > 0) {
      this.queue = _.reject(this.queue, (item) => idsToRemove.includes(item.id));
    }
  }
}
