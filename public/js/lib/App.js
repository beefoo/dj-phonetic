class App {
  constructor(options = {}) {
    const defaults = {
      phraseDurationMin: 200,
      phraseDurationMax: 2000,
      dataviz: false,
    };
    const q = StringUtil.queryParams();
    this.options = _.extend({}, defaults, options, q);
    this.init();
  }

  init() {
    this.audioPlayer = new AudioPlayer();
    this.transcript = new Transcript();
    let transcriptFn = 'audio/afccal000001_speech_by_fiorello_h_la_guardia_excerpt_06-54.json';
    if (this.options.dataviz !== false) transcriptFn = transcriptFn.replace('.json', '-with-features.json');
    const transcriptPromise = this.transcript.loadFromURL(transcriptFn);
    const audioPromise = this.audioPlayer.loadFromURL('audio/afccal000001_speech_by_fiorello_h_la_guardia_excerpt_06-54.mp3');
    $.when(transcriptPromise, audioPromise).done(() => this.onReady());
  }

  onKeyboardClick(event) {
    const { pointerType } = event;
    // only account for keyboard click
    if (pointerType !== '') return;
    const fakePointer = { isPrimary: true };
    this.playClipFromElement(fakePointer, $(event.currentTarget));
  }

  onReady() {
    this.pointerManager = new PointerManager({
      childSelector: '.clip',
      onPointerDown: (pointer, $el) => this.playClipFromElement(pointer, $el),
      onPointerEnter: (pointer, $el) => this.playClipFromElement(pointer, $el),
      onSwipe: (vector, pointer, $el) => this.onSwipe(vector, pointer, $el),
      target: '#transcript',
    });
    if (this.options.dataviz !== false) {
      this.dataviz = new DataViz({
        features: this.transcript.getFeatures(),
        onFilterMax: (feature, value) => {
          this.transcript.filterMax(feature, value);
        },
        onFilterMin: (feature, value) => {
          this.transcript.filterMin(feature, value);
        },
        onSort: (feature, direction) => {
          this.transcript.sort(feature, direction);
        },
        onSortOff: () => {
          this.transcript.sortOff();
        },
      });
    }
    $('#transcript').on('click', '.clip', (e) => this.onKeyboardClick(e));
    this.update();
  }

  onSwipe(vector, pointer, $el) {
    if (vector.right === false || vector.right <= 0) return;
    if (vector.up || vector.down) return;
    const nVelocity = vector.right;
    const clip = this.transcript.getClipFromElement($el);
    if (!clip || clip.type === 'word') return;
    const startingPhone = clip;
    const { phraseDurationMin, phraseDurationMax } = this.options;
    const duration = MathUtil.lerp(phraseDurationMin, phraseDurationMax, nVelocity);
    const phones = this.transcript.getPhraseByDuration(startingPhone, duration / 1000.0);
    this.playClips(phones);
  }

  playClipFromElement(pointer, $el) {
    const clip = this.transcript.getClipFromElement($el);
    if (!clip) return;

    if (pointer.isPrimary) {
      $el[0].focus();
      if (this.dataviz && _.has(clip, 'features')) {
        this.dataviz.onChange(clip.features);
      }
    }
    // highlight the phone
    if (clip.type === 'phone') {
      this.playClips([clip]);
    // if word, highlight each phone of the word
    } else if (clip.type === 'word') {
      this.playClips(clip.phones);
    }
  }

  playClips(clips) {
    if (clips.length <= 0) return;
    const now = Date.now();
    const firstClip = clips[0];
    const lastClip = _.last(clips);
    clips.forEach((clip, i) => {
      const id = `${clip.id}-${now}`;
      const when = clip.start - firstClip.start;
      const $el = $(`#${clip.id}`);
      this.audioPlayer.schedule(id, when, () => {
        $el.removeClass('playing');
        setTimeout(() => $el.addClass('playing'), 1);
      });
    });
    this.audioPlayer.play(firstClip.start, lastClip.end);
  }

  update() {
    window.requestAnimationFrame(() => this.update());

    this.audioPlayer.update();
  }
}
