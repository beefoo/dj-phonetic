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
    this.tempo = this.constructor.bpmToTempo(this.options.bpm);
    console.log(this.tempo);
    this.loadFromMidi('mid/drums.mid');
  }

  loadFromMidi(midiFilename) {
    const midiPromise = Midi.fromUrl(midiFilename);
    midiPromise.then((midi) => {
      console.log(midi);
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
      const trackGroup = {
        name: groupName,
        tracks: group,
      };
      return trackGroup;
    });
    this.patterns = _.sortBy(patterns, (pattern) => _.min(pattern.tracks, (track) => track.index));
    this.selectRandomPattern();
  }

  selectRandomPattern() {
    this.pattern = this.patterns[1];
    console.log(this.pattern);
    const [highhat, kick, snare] = this.pattern.tracks;
    const { notes } = highhat;
    const { ticksPerBeat } = this.options;
    const { tempo } = this;
    notes.forEach((note) => {
      const { ticks, durationTicks } = note;
      const time = this.constructor.tick2second(ticks, ticksPerBeat, tempo);
      const duration = this.constructor.tick2second(durationTicks, ticksPerBeat, tempo);
    });
  }

  // start() {

  // }

  // step() {

  // }

  // stop() {

  // }
}
