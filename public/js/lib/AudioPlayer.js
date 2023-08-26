class AudioPlayer {
  constructor(options = {}) {
    const defaults = {
      buffer: false,
      fadeIn: 0.025,
      fadeOut: 0.025,
      filters: {},
      offline: false,
      offlineRenderLength: 2, // in seconds
      reverb: 0.5,
    };
    this.options = _.extend({}, defaults, options);
    this.init();
  }

  init() {
    this.loadedId = false;
    this.isLoading = false;

    if (this.options.offline === true && this.options.buffer !== false) {
      const { numberOfChannels, sampleRate } = this.options.buffer;
      const ctxLength = this.options.offlineRenderLength * sampleRate;
      this.ctx = new OfflineAudioContext(numberOfChannels, ctxLength, sampleRate);
    } else {
      this.ctx = new AudioContext();
    }

    if (this.options.buffer !== false) {
      this.audioBuffer = this.options.buffer;
      this.loadedId = 'default';
    }
  }

  cancelTasks(tag = false) {
    if (tag === false) this.queue = [];
    else {
      this.queue = this.queue.filter((task) => task.tag !== tag);
    }
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
    const audioFilter = this.ctx.createBiquadFilter();
    audioFilter.type = params.type;
    if (_.has(params, 'frequency')) audioFilter.frequency.value = params.frequency;
    if (_.has(params, 'gain')) audioFilter.gain.value = params.gain;
    return audioFilter;
  }

  createFilterChain(params) {
    if (params.length <= 0) return false;
    const lastParamIndex = params.length - 1;
    const filters = [];
    params.forEach((param, i) => {
      const audioFilter = this.createFilter(param);
      filters.push(audioFilter);
      if (i > 0) {
        filters[i - 1].connect(filters[i]);
      }
      if (i === lastParamIndex) filters[i].connect(this.destination.input);
    });
    return filters[0];
  }

  isReady() {
    return this.loadedId !== false;
  }

  isRunning() {
    return this.ctx.state === 'running';
  }

  load() {
    const readyPromise = $.Deferred();
    const effectsPromise = this.loadEffects();
    this.queue = [];

    $.when(effectsPromise).done(() => {
      this.destination = this.reverbFilter;
      this.loadFilters(this.options.filters);
      this.destination.output.connect(this.ctx.destination);
      readyPromise.resolve();
    });
    return readyPromise;
  }

  loadEffects() {
    const { ctx } = this;
    const { reverb } = this.options;
    this.reverbFilter = new AudioReverbFilter({
      context: ctx,
      wetLevel: reverb,
    });
    return this.reverbFilter.load();
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
        this.firstLoaded = true;
        loadPromise.resolve(url);
      });
    });

    return loadPromise;
  }

  play(start, end, when = 0, volume = 1, reverse = false, filterName = false) {
    if (!this.isReady()) return false;
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
      gainNode.connect(this.destination.input);
    }
    audioSource.start(when, offsetStart, dur);
    return audioSource;
  }

  renderOffline() {
    const promise = $.Deferred();
    if (this.options.offline !== true) {
      return promise.reject();
    }
    this.ctx.startRendering().then((renderedBuffer) => {
      promise.resolve(renderedBuffer);
    });
    return promise;
  }

  resume() {
    this.ctx.resume();
  }

  schedule(id, when, task, tag = 'default') {
    if (when <= 0) task();

    const now = this.ctx.currentTime;
    this.queue.push({
      id,
      task,
      when: when + now,
      tag,
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
