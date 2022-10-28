class AudioPlayer {
  constructor(options = {}) {
    const defaults = {};
    this.options = _.extend({}, defaults, options);
    this.init();
  }

  init() {
    this.ctx = new AudioContext();
    this.loadedId = false;
    this.isLoading = false;
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
    const dur = end - start;
    const audioSource = this.ctx.createBufferSource();
    audioSource.buffer = this.audioBuffer;
    audioSource.connect(this.ctx.destination);
    audioSource.start(0, start, dur);
  }
}
