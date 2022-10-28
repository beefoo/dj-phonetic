class App {
  constructor(options = {}) {
    const defaults = {};
    this.options = _.extend({}, defaults, options);
    this.init();
  }

  init() {
    this.audioPlayer = new AudioPlayer();
    this.transcript = new Transcript({
      onClickPhone: (phone) => {
        this.audioPlayer.play(phone.start, phone.end);
      },
    });
    const transcriptPromise = this.transcript.loadFromURL('audio/afccal000001_speech_by_fiorello_h_la_guardia_excerpt_06-54.json');
    const audioPromise = this.audioPlayer.loadFromURL('audio/afccal000001_speech_by_fiorello_h_la_guardia_excerpt_06-54.mp3');
    $.when(transcriptPromise, audioPromise).done(() => this.onReady());
  }

  onReady() {
    console.log('Ready');
    this.loaded = true;
  }
}
