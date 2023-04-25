class App {
  constructor(options = {}) {
    const defaults = {
      dataviz: false,
      filters: {},
      phraseDurationMin: 200,
      phraseDurationMax: 2000,
      samplesPerInstrument: 8,
      transcripts: [],
    };
    const q = StringUtil.queryParams();
    this.options = _.extend({}, defaults, options, q);
    this.init();
  }

  init() {
    this.$el = $('#app');
    this.transcriptManager = new TranscriptManager({
      onChange: (transcript) => this.onChangeTranscript(transcript),
      transcripts: this.options.transcripts,
    });
    this.$transcript = $('#transcript');
    this.instruments = {};
    this.isReady = false;
    this.onChangeTranscript(this.transcriptManager.selectedTranscript);
  }

  isItemPlaying() {
    return this.itemAudioSource;
  }

  onChangeTranscript(newTranscript) {
    const { id } = newTranscript;
    let transcriptFn = `audio/${id}.json`;
    const audioFn = `audio/${id}.mp3`;
    if (this.options.dataviz !== false) transcriptFn = transcriptFn.replace('.json', '-with-features.json');
    const audioPlayer = new AudioPlayer({
      filters: this.options.filters,
    });
    const transcript = new Transcript();
    const transcriptPromise = transcript.loadFromURL(transcriptFn);
    const audioPromise = audioPlayer.loadFromURL(audioFn);
    $.when(transcriptPromise, audioPromise).done(() => {
      this.stopItem();
      $('.toggle-play-item').removeClass('active');
      this.audioPlayer = audioPlayer;
      this.transcript = transcript;
      if (!this.isReady) this.onReady();
      else this.sequencer.restart();
      this.transcript.onReady();
      this.setInstrumentsAutomatically();
    });
  }

  static onInstrumentChange(instrumentName, clip) {
    const $el = $(`#${clip.id}`);
    $(`.clip.${instrumentName}`).removeClass('selected');
    $el.addClass('selected');
  }

  onKeyboardClick(event) {
    const { pointerType } = event;
    // only account for keyboard click
    if (pointerType !== '') return;
    const fakePointer = { isPrimary: true, type: 'keyboard' };
    this.playClipFromElement(fakePointer, $(event.currentTarget), 'keyboard');
  }

  onReady() {
    this.pointerManager = new PointerManager({
      childSelector: '.clip',
      onPointerDown: (pointer, $el) => this.playClipFromElement(pointer, $el, 'pointerdown'),
      onPointerEnter: (pointer, $el) => this.playClipFromElement(pointer, $el, 'pointerenter'),
      onPointerUp: (pointer, $el) => this.playItemFromElement(pointer, $el),
      onSwipe: (vector, pointer, $el) => this.onSwipe(vector, pointer, $el),
      target: '#transcript',
    });
    this.controlsManager = new PointerManager({
      childSelector: '.control',
      onPointerExit: (pointer, $el) => this.triggerControlFromElement(pointer, $el),
      target: '#controls',
    });
    this.sequencer = new Sequencer({
      audioPlayer: this.audioPlayer,
      onStep: (props) => this.onStep(props),
    });
    this.transcriptManager.loadListeners();
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
    this.$transcript.on('click', '.clip', (e) => this.onKeyboardClick(e));
    $('.toggle-play-item').on('click', (e) => this.togglePlayItem(e));
    $('.toggle-phones').on('change', () => this.togglePhones());
    const delayedResize = _.debounce(() => this.onResize(), 300);
    $(window).on('resize', delayedResize);
    this.update();
    this.isReady = true;
  }

  onResize() {
    this.transcript.onResize();
  }

  onStep(props) {
    // console.log(props);
    const {
      duration,
      instrument,
      velocity,
      when,
    } = props;
    if (!_.has(this.instruments, instrument)) return;
    const clip = _.clone(this.instruments[instrument].clip);
    if (duration < (clip.end - clip.start)) clip.end = clip.start + duration;
    this.playClips([clip], when, velocity, false, instrument);
  }

  onSwipe(vector, pointer, $el) {
    if (this.isItemPlaying() || this.queueItemPlay === true) return;
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

  playClipFromElement(pointer, $el, originEvent = 'unknown') {
    const clip = this.transcript.getClipFromElement($el);
    if (!clip) return;

    if (pointer.isPrimary) {
      $el[0].focus();
      if (this.dataviz && _.has(clip, 'features')) {
        this.dataviz.onChange(clip.features);
      }
      if (_.has(clip, 'instrument') && (originEvent === 'pointerdown' || originEvent === 'keyboard')) {
        this.selectInstrument(clip.instrument, clip.id);
      }
      if (this.isItemPlaying()) {
        this.stopItem();
        this.queueItemPlay = true;
      }
    }

    const pointerDirection = pointer.type === 'keyboard' ? {} : pointer.getDirection();
    const isReverse = pointer.type === 'keyboard' ? false : pointerDirection.left !== false;
    // highlight the phone
    if (clip.type === 'phone') {
      this.playClips([clip], 0, 1, isReverse);
    // if word, highlight each phone of the word
    } else if (clip.type === 'word') {
      this.playClips(clip.phones);
    }
  }

  playClips(clips, when = 0, volume = 1, reverse = false, filterName = false, tag = 'default') {
    if (clips.length <= 0) return false;
    const now = Date.now();
    const firstClip = clips[0];
    const lastClip = _.last(clips);
    const duration = lastClip.end - firstClip.start;
    clips.forEach((clip, i) => {
      const id = `${clip.id}-${now}`;
      let scheduleWhen = clip.start - firstClip.start;
      if (reverse) {
        scheduleWhen = duration - scheduleWhen - (clip.end - clip.start);
      }
      const $el = $(`#${clip.id}`);
      this.audioPlayer.schedule(id, scheduleWhen, () => {
        $el.removeClass('playing');
        setTimeout(() => $el.addClass('playing'), 1);
      }, tag);
    });
    return this.audioPlayer.play(firstClip.start, lastClip.end, when, volume, reverse, filterName);
  }

  playItem(startingClip = false) {
    if (this.isItemPlaying()) {
      this.stopItem();
    }
    const clips = this.transcript.getClips(startingClip);
    this.itemAudioSource = this.playClips(clips, 0, 1, false, false, 'item');
    if (this.itemAudioSource) {
      this.itemAudioSource.onended = (event) => {
        this.stopItem();
        $('.toggle-play-item').removeClass('active');
      };
    }
  }

  playItemFromElement(pointer, $el) {
    if (!pointer.isPrimary) return;
    if (!this.isItemPlaying() && this.queueItemPlay !== true) return;
    this.queueItemPlay = false;
    const clip = this.transcript.getClipFromElement($el);
    if (!clip) return;
    this.playItem(clip);
  }

  randomizePattern() {
    this.sequencer.selectRandomPattern();
  }

  selectInstrument(instrumentName, clipId) {
    const { list } = this.instruments[instrumentName];
    const index = _.findIndex(list, (clip) => clip.id === clipId);
    if (index < 0) return;
    const clip = list[index];
    this.instruments[instrumentName].index = index;
    this.instruments[instrumentName].clip = clip;
    this.constructor.onInstrumentChange(instrumentName, clip);
  }

  setInstrument(instrumentName, clip) {
    const $el = $(`#${clip.id}`);
    $el.addClass(`instrument ${instrumentName}`);
    this.transcript.setClipData(clip, 'instrument', instrumentName);
  }

  setInstrumentsAutomatically() {
    const { instruments } = this.transcript.data;
    const clips = this.transcript.getClips();
    const bestInstruments = {};
    instruments.forEach((instrument) => {
      const sortedClips = _.sortBy(clips, (clip) => -clip.instrumentScores[instrument.name]);
      const bestClips = sortedClips.slice(0, this.options.samplesPerInstrument);
      const bestClip = bestClips[0];
      bestInstruments[instrument.name] = {
        list: bestClips,
        index: 0,
        clip: bestClip,
      };
      bestClips.forEach((clip) => {
        this.setInstrument(instrument.name, clip);
      });
      this.constructor.onInstrumentChange(instrument.name, bestClip);
    });
    this.instruments = bestInstruments;
  }

  stepInstrument(amount, instrumentName) {
    if (!_.has(this.instruments, instrumentName)) return;

    const instrument = this.instruments[instrumentName];
    const { list, index } = instrument;
    const { samplesPerInstrument } = this.options;
    const newIndex = MathUtil.wrap(index + amount, 0, samplesPerInstrument);
    const clip = list[newIndex];
    this.instruments[instrumentName].index = newIndex;
    this.instruments[instrumentName].clip = clip;
    this.constructor.onInstrumentChange(instrumentName, clip);
  }

  stepPattern(amount) {
    this.sequencer.stepPattern(amount);
  }

  stopItem() {
    if (this.itemAudioSource) {
      this.itemAudioSource.onended = () => {};
      this.itemAudioSource.stop();
    }
    this.itemAudioSource = false;
    if (!this.audioPlayer) return;
    this.audioPlayer.cancelTasks('item');
  }

  togglePhones() {
    const value = $('.toggle-phones:checked').val();
    if (value === 'phones') this.$transcript.addClass('show-phones');
    else this.$transcript.removeClass('show-phones');
  }

  togglePlay($el) {
    $el.toggleClass('active');
    if ($el.hasClass('active')) {
      this.sequencer.start();
      this.$el.addClass('is-playing');
    } else {
      this.sequencer.stop();
      this.$el.removeClass('is-playing');
    }
  }

  togglePlayItem(event) {
    const $el = $(event.currentTarget);
    $el.toggleClass('active');
    if ($el.hasClass('active')) this.playItem();
    else this.stopItem();
  }

  triggerControlFromElement(pointer, $el) {
    const action = $el.attr('data-action');
    const value = $el.attr('data-value');
    if (action === undefined) return;
    if (action === 'toggle-play') this.togglePlay($el);
    else if (action === 'randomize-pattern') this.randomizePattern();
    else if (action === 'next-pattern') this.stepPattern(1);
    else if (action === 'previous-pattern') this.stepPattern(-1);
    else if (action === 'toggle-instrument') this.sequencer.toggleInstrument($el, value);
    else if (action === 'previous-instrument') this.stepInstrument(-1, value);
    else if (action === 'next-instrument') this.stepInstrument(1, value);
  }

  update() {
    window.requestAnimationFrame(() => this.update());

    this.audioPlayer.update();
    this.sequencer.step();
  }
}
