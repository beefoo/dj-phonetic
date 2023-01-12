class Sequencer {
  constructor(options = {}) {
    const defaults = {
      bpm: 120,
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

  init() {
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
    const groupedTracks = _.groupBy(updatedTracks, 'group');
    const patterns = _.map(groupedTracks, (group, groupName) => {
      const { endOfTrackTicks } = _.max(group, 'endOfTrackTicks');
      const pattern = {
        name: groupName,
        tracks: group,
        ticks: endOfTrackTicks,
        duration: this.constructor.tick2second(endOfTrackTicks),
        tempo: false,
      };
      return this.updatePatternTempo(pattern, this.tempo);
    });
    this.patterns = _.sortBy(patterns, (pattern) => _.min(pattern.tracks, (track) => track.index));
    this.selectRandomPattern();
  }

  selectRandomPattern() {
    this.pattern = this.patterns[1];
    console.log(this.pattern);
  }

  // start() {

  // }

  // step() {

  // }

  // stop() {

  // }

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
