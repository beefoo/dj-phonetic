class TranscriptManager {
  constructor(options = {}) {
    const defaults = {
      onChange: (transcript) => {},
      selectedIndex: 0,
      transcripts: [],
    };
    this.options = _.extend({}, defaults, options);
    this.init();
  }

  init() {
    this.transcripts = this.options.transcripts;
    this.selectedIndex = this.options.selectedIndex;
    this.selectedTranscript = this.transcripts[this.selectedIndex];
    this.renderTranscripts(this.transcripts);
  }

  loadListeners() {
    this.$select.on('change', (e) => this.select());
  }

  renderTranscripts(transcripts) {
    const { selectedIndex } = this;
    const $select = $('#transcript-select');
    let html = '';
    transcripts.forEach((transcript, i) => {
      const selected = i === selectedIndex ? ' selected' : '';
      html += `<option value="${i}"${selected}>${transcript.title}</option>`;
    });
    $select.html(html);
    this.$select = $select;
  }

  select() {
    const selectedIndex = parseInt(this.$select.val(), 10);
    if (selectedIndex === this.selectedIndex) return;
    this.selectedIndex = selectedIndex;
    this.selectedTranscript = this.transcripts[selectedIndex];
    this.options.onChange(this.selectedTranscript);
  }
}
