class AudioPlayer {
  constructor(options = {}) {
    const defaults = {
      url: 'audio/afccal000001_speech_by_fiorello_h_la_guardia_excerpt_06-54.mp3',
    };
    this.options = _.extend({}, defaults, options);
    this.init();
  }

  init() {
    this.initialized = true;
  }
}
