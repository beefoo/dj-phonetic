class Sequencer {
  constructor(options = {}) {
    const defaults = {
      bpm: 120,
      latency: 0.5,
      ticksPerBeat: 480,
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

  onLoadMidi(midi) {
    const { ticksPerBeat } = this.options;
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
        updatedTrack.notes = track.notes.map((note, j) => {
          const updatedNote = _.clone(note);
          updatedNote.index = j;
          updatedNote.trackIndex = i;
          updatedNote.isLast = false;
          return updatedNote;
        });
        return updatedTrack;
      });
      const { endOfTrackTicks } = _.max(groupTracks, 'endOfTrackTicks');
      // determine the last note in track groups
      const notes = _.flatten(_.pluck(groupTracks, 'notes'));
      notes.sort((a, b) => {
        if (a.ticks > b.ticks) return -1;
        if (a.ticks < b.ticks) return 1;
        if (a.trackIndex > b.trackIndex) return -1;
        if (a.trackIndex < b.trackIndex) return 1;
        return 0;
      });
      const lastNote = notes.shift();
      groupTracks[lastNote.trackIndex].notes[lastNote.index].isLast = true;
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
    this.selectRandomPattern();
  }

  selectRandomPattern() {
    this.pattern = this.patterns[1];
    this.pattern.loopCount = 0;
    console.log(this.pattern);
  }

  start() {
    this.startTime = this.audioPlayer.ctx.currentTime;
  }

  step() {
    if (!this.pattern || !this.audioPlayer || !this.startTime) return;

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
    const { loopCount } = pattern;

    this.pattern.tracks.forEach((track, i) => {
      track.notes.forEach((note, j) => {
        if (note.time <= patternTimeTrigger && note.loopCount <= loopCount) {
          this.pattern.tracks[i].notes[j].loopCount = loopCount + 1;
          // queue audio to play in the future (+latency seconds)
          const when = note.time > patternTime
            ? note.time - patternTime
            : note.time + (pattern.duration - patternTime);
          // this.audioPlayer.play(start, end, when);
          // if last, increase loopCount
          if (note.isLast) {
            this.pattern.loopCount += 1;
          }
        }
      });
    });
  }

  stop() {
    this.startTime = false;
  }

  updateBPM(bpm) {
    this.tempo = this.constructor.bpmToTempo(bpm);
    if (this.pattern === false) return;
    this.pattern = this.updatePatternTempo(this.pattern, this.tempo);
  }

  updatePatternTempo(pattern, tempo) {
    if (pattern.tempo === tempo) return pattern;
    const { ticksPerBeat } = this.options;
    const updatedPattern = _.clone(pattern);
    updatedPattern.tracks = pattern.tracks.map((track) => {
      const updatedTrack = _.clone(track);
      updatedTrack.notes = track.notes.map((note) => {
        const updatedNote = _.clone(note);
        const { ticks, durationTicks } = note;
        updatedNote.time = this.constructor.tick2second(ticks, ticksPerBeat, tempo);
        updatedNote.duration = this.constructor.tick2second(durationTicks, ticksPerBeat, tempo);
        return updatedNote;
      });
      return updatedTrack;
    });
    updatedPattern.tempo = tempo;
    return updatedPattern;
  }
}
