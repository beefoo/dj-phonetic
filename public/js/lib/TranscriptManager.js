class TranscriptManager {
  constructor(options = {}) {
    const defaults = {
      metadataTemplate: '#item-metadata-template',
      onChange: (transcript) => {},
      speaker: false,
      transcripts: [],
    };
    this.options = _.extend({}, defaults, options);
    this.init();
  }

  init() {
    this.transcripts = this.options.transcripts;
    this.count = this.transcripts.length;
    this.selectedIndex = 0;
    if (this.options.speaker !== false) {
      const index = _.findIndex(this.transcripts, (t) => t.speakers === this.options.speaker);
      if (index >= 0) this.selectedIndex = index;
    }
    this.selectedTranscript = this.transcripts[this.selectedIndex];
    this.metadataTemplateString = $(this.options.metadataTemplate).html();
    this.$app = $('#app');
    this.$metadata = $('#item-metadata');
    this.renderTranscripts(this.transcripts);
    this.renderMetadata(this.selectedTranscript);
  }

  loadListeners() {
    this.$select.on('change', (e) => this.select());
    const delayedSelect = _.debounce(() => this.select(), 500);
    $('.prev-transcript').on('click', (e) => {
      this.stepSelect(-1);
      delayedSelect();
    });
    $('.next-transcript').on('click', (e) => {
      this.stepSelect(1);
      delayedSelect();
    });
  }

  renderMetadata(transcript = false) {
    const template = this.metadataTemplateString;
    const html = StringUtil.loadTemplateFromString(template, Mustache, transcript);
    this.$metadata.html(html);
  }

  renderTranscripts(transcripts) {
    const { selectedIndex } = this;
    const $select = $('#transcript-select');
    let html = '';
    transcripts.forEach((transcript, i) => {
      const selected = i === selectedIndex ? ' selected' : '';
      html += `<option value="${i}"${selected}>${transcript.speakers}</option>`;
    });
    $select.html(html);
    this.$select = $select;
  }

  select() {
    const selectedIndex = parseInt(this.$select.val(), 10);
    if (selectedIndex === this.selectedIndex) {
      this.$app.removeClass('is-loading');
      return;
    }
    this.$app.addClass('is-loading');
    this.selectedIndex = selectedIndex;
    this.selectedTranscript = this.transcripts[selectedIndex];
    this.renderMetadata(this.selectedTranscript);
    this.options.onChange(this.selectedTranscript);
  }

  stepSelect(amount) {
    this.$app.addClass('is-loading');
    const currentIndex = parseInt(this.$select.val(), 10);
    const newIndex = MathUtil.wrap(currentIndex + amount, 0, this.count);
    this.$select.val(newIndex);
    this.renderMetadata(this.transcripts[newIndex]);
  }
}
