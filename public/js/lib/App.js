class App {
  constructor(options = {}) {
    const defaults = {};
    this.options = _.extend({}, defaults, options);
    this.init();
  }

  init() {
    this.transcript = new Transcript();
    const transcriptPromise = this.transcript.loadByUrl('audio/afccal000001_speech_by_fiorello_h_la_guardia_excerpt_06-54.json');

    $.when(transcriptPromise).done(() => this.onReady());
  }

  onReady() {
    console.log('Ready');
    this.loaded = true;
  }
}
