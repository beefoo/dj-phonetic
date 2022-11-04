class App {
  constructor(options = {}) {
    const defaults = {};
    this.options = _.extend({}, defaults, options);
    this.init();
  }

  init() {
    this.audioPlayer = new AudioPlayer();
    this.transcript = new Transcript();
    const transcriptPromise = this.transcript.loadFromURL('audio/afccal000001_speech_by_fiorello_h_la_guardia_excerpt_06-54.json');
    const audioPromise = this.audioPlayer.loadFromURL('audio/afccal000001_speech_by_fiorello_h_la_guardia_excerpt_06-54.mp3');
    $.when(transcriptPromise, audioPromise).done(() => this.onReady());
  }

  static onPointerExit($el) {
    $el.removeClass('active');
  }

  onKeyboardClick(event) {
    const { pointerType } = event;
    // only account for keyboard click
    if (pointerType !== '') return;
    this.playClipFromElement($(event.currentTarget), false);
  }

  onReady() {
    this.pointerManager = new PointerManager({
      childSelector: '.clip',
      onPointerDown: (event, $el) => this.playClipFromElement($el),
      onPointerEnter: (event, $el) => this.playClipFromElement($el),
      onPointerExit: (event, $el) => this.constructor.onPointerExit($el),
      target: '#transcript',
    });
    $('.clip').on('click', (e) => this.onKeyboardClick(e));
  }

  playClipFromElement($el, active = true) {
    const clip = this.transcript.getClipFromElement($el);
    if (!clip) return;

    if (active) $el.addClass('active');
    this.audioPlayer.play(clip.start, clip.end);
  }
}
