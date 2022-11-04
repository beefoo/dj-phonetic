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
    this.update();
  }

  playClipFromElement($el, active = true) {
    const clip = this.transcript.getClipFromElement($el);
    if (!clip) return;

    if (active) $el.addClass('active');
    // highlight the phone
    if (clip.type === 'phone') {
      $el.removeClass('playing');
      setTimeout(() => $el.addClass('playing'), 1);
    // if word, highlight each phone of the word
    } else if (clip.type === 'word') {
      const now = Date.now();
      const firstPhone = clip.phones[0];
      clip.phones.forEach((phone, i) => {
        const id = `${phone.id}-${now}`;
        const when = phone.start - firstPhone.start;
        const $phoneEl = $(`#${phone.id}`);
        this.audioPlayer.schedule(id, when, () => {
          $phoneEl.removeClass('playing');
          setTimeout(() => $phoneEl.addClass('playing'), 1);
        });
      });
    }
    this.audioPlayer.play(clip.start, clip.end);
  }

  update() {
    window.requestAnimationFrame(() => this.update());

    this.audioPlayer.update();
  }
}
