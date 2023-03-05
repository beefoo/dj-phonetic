class Sequencer {
  constructor(options = {}) {
    const defaults = {
      bpm: 120,
      latency: 0.5,
      onStep: (props) => {},
      patternLoopCount: 1,
    };
    this.options = _.extend({}, defaults, options);
    this.init();
  }

  static bpmToTempo(bpm) {
    return Math.round((60 * 1000000) / bpm);
  }

  static tick2second(tick, ticksPerBeat, tempo) {
    const scale = (tempo * 0.000001) / ticksPerBeat;
    return tick * scale;
  }

  static time2IntervalTime(time, startTime, intervalDuration) {
    const elapsed = time - startTime;
    return elapsed % intervalDuration;
  }

  init() {
    this.audioPlayer = this.options.audioPlayer;
    this.pattern = false;
    this.startTime = false;
    this.$patternSelect = $('#select-pattern');
    this.updateBPM(this.options.bpm);
    this.loadFromMidi('mid/drums.mid');
  }

  loadFromMidi(midiFilename) {
    const midiPromise = Midi.fromUrl(midiFilename);
    midiPromise.then((midi) => {
      // console.log(midi);
      this.onLoadMidi(midi);
    });
  }

  loadPatternSelectOptions(patterns) {
    let html = '';
    _.times(patterns.length, (n) => {
      html += `<option value="${n}">Drum pattern ${(n + 1)}</option>`;
    });
    this.$patternSelect.html(html);
    this.$patternSelect.on('change', (e) => this.selectPattern(parseInt(this.$patternSelect.val(), 10)));
  }

  onLoadMidi(midi) {
    const ticksPerBeat = midi.header.ppq;
    this.ticksPerBeat = ticksPerBeat;
    const { tempo } = this;
    // group the tracks based on their names
    const updatedTracks = midi.tracks.map((track, i) => {
      const updatedTrack = _.clone(track);
      updatedTrack.index = i;
      const nameParts = track.name.toLowerCase().split('_');
      if (nameParts.length < 2) {
        updatedTrack.group = track.name;
        updatedTrack.instrument = '';
      } else {
        updatedTrack.instrument = nameParts.pop();
        updatedTrack.group = nameParts.join('_');
      }
      return updatedTrack;
    });
    // group the tracks
    const groupedTracks = _.groupBy(updatedTracks, 'group');
    const patterns = _.map(groupedTracks, (group, groupName) => {
      const groupTracks = group.map((track, i) => {
        const updatedTrack = _.clone(track);
        updatedTrack.groupIndex = i;
        updatedTrack.volume = 1;
        updatedTrack.notes = track.notes.map((note, j) => {
          const updatedNote = _.clone(note);
          updatedNote.index = j;
          updatedNote.trackIndex = i;
          updatedNote.loopCount = 0;
          return updatedNote;
        });
        return updatedTrack;
      });
      const { endOfTrackTicks } = _.min(groupTracks, 'endOfTrackTicks');
      // construct pattern object
      const pattern = {
        name: groupName,
        tracks: groupTracks,
        ticks: endOfTrackTicks,
        duration: this.constructor.tick2second(endOfTrackTicks, ticksPerBeat, tempo),
        tempo: false,
      };
      return this.updatePatternTempo(pattern, this.tempo);
    });
    this.patterns = _.sortBy(patterns, (pattern) => _.min(pattern.tracks, (track) => track.index));
    this.patterns = this.patterns.map((pattern, index) => {
      const updatedPattern = _.clone(pattern);
      updatedPattern.index = index;
      return updatedPattern;
    });
    // this.loadPatternSelectOptions(this.patterns);
    this.selectRandomPattern();
  }

  onPatternChange() {
    this.restart();
    console.log(this.pattern);
  }

  restart() {
    const isStopped = this.startTime === false;
    this.stop();
    if (!isStopped) this.start();
  }

  selectRandomPattern() {
    if (this.patterns === undefined || this.patterns.length <= 0) return;
    this.isLoadingPattern = true;
    this.pattern = _.sample(this.patterns);
    this.onPatternChange();
    this.isLoadingPattern = false;
  }

  selectPattern(i) {
    if (this.patterns === undefined || this.patterns.length <= 0) return;
    this.pattern = this.patterns[i];
    this.onPatternChange();
  }

  start() {
    this.startTime = this.audioPlayer.ctx.currentTime;
  }

  step() {
    if (!this.pattern
        || !this.audioPlayer
        || this.startTime === false
        || this.isLoadingPattern) return;

    const { pattern } = this;
    const now = this.audioPlayer.ctx.currentTime;
    const { latency } = this.options;
    const later = now + latency;
    const patternTime = this.constructor.time2IntervalTime(now, this.startTime, pattern.duration);
    const patternTimeTrigger = this.constructor.time2IntervalTime(
      later,
      this.startTime,
      pattern.duration,
    );
    const loopCount = Math.floor((later - this.startTime) / pattern.duration);

    // automatically step pattern
    if (loopCount >= this.options.patternLoopCount) {
      this.stepPattern();
      return;
    }

    this.pattern.tracks.forEach((track, i) => {
      if (track.volume <= 0) return;
      track.notes.forEach((note, j) => {
        if (note.time <= patternTimeTrigger && note.loopCount <= loopCount) {
          this.pattern.tracks[i].notes[j].loopCount = loopCount + 1;
          // queue audio to play in the future (+latency seconds)
          const when = note.time > patternTime
            ? note.time - patternTime
            : note.time + (pattern.duration - patternTime);
          this.options.onStep({
            duration: note.duration,
            instrument: track.instrument,
            velocity: note.velocity,
            when,
          });
        }
      });
    });
  }

  stepPattern(amount = 1) {
    if (this.patterns === undefined || this.patterns.length <= 0 || !this.pattern) return;
    this.isLoadingPattern = true;
    const { index } = this.pattern;
    const newIndex = MathUtil.wrap(index + amount, 0, this.patterns.length);
    this.pattern = this.patterns[newIndex];
    this.onPatternChange();
    this.isLoadingPattern = false;
  }

  stop() {
    this.startTime = false;

    // reset loop count
    this.pattern.tracks.forEach((track, i) => {
      track.notes.forEach((note, j) => {
        this.pattern.tracks[i].notes[j].loopCount = 0;
      });
    });
  }

  toggleInstrument($el, value) {
    $el.toggleClass('active');
    const isActive = $el.hasClass('active');
    const volume = isActive ? 1 : 0;

    this.pattern.tracks.forEach((track, i) => {
      if (track.instrument === value) {
        this.pattern.tracks[i].volume = volume;
      }
    });
  }

  updateBPM(bpm) {
    this.tempo = this.constructor.bpmToTempo(bpm);
    if (this.pattern === false) return;
    this.pattern = this.updatePatternTempo(this.pattern, this.tempo);
  }

  updatePatternTempo(pattern, tempo) {
    if (pattern.tempo === tempo) return pattern;
    const { ticksPerBeat } = this;
    const updatedPattern = _.clone(pattern);
    updatedPattern.tracks = pattern.tracks.map((track) => {
      const updatedTrack = _.clone(track);
      track.notes.forEach((note, j) => {
        const { ticks, durationTicks } = note;
        const time = this.constructor.tick2second(ticks, ticksPerBeat, tempo);
        const duration = this.constructor.tick2second(durationTicks, ticksPerBeat, tempo);
        updatedTrack.notes[j].time = time;
        updatedTrack.notes[j].duration = duration;
        if (j > 0) {
          const prev = updatedTrack.notes[j - 1];
          if ((time - prev.time) < prev.duration) {
            updatedTrack.notes[j - 1].duration = Math.max(time - prev.time, 0.001);
          }
        }
      });
      return updatedTrack;
    });
    updatedPattern.tempo = tempo;
    return updatedPattern;
  }
}
