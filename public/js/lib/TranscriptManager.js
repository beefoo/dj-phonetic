class TranscriptManager {
  constructor(options = {}) {
    const defaults = {
      metadataTemplate: '#item-metadata-template',
      onChange: (transcript) => {},
      selectedIndex: 0,
      transcripts: [],
    };
    this.options = _.extend({}, defaults, options);
    this.init();
  }

  init() {
    this.transcripts = this.options.transcripts;
    this.count = this.transcripts.length;
    this.selectedIndex = this.options.selectedIndex;
    this.selectedTranscript = this.transcripts[this.selectedIndex];
    this.metadataTemplateString = $(this.options.metadataTemplate).html();
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
    this.renderMetadata(this.selectedTranscript);
    this.options.onChange(this.selectedTranscript);
  }

  stepSelect(amount) {
    const currentIndex = parseInt(this.$select.val(), 10);
    const newIndex = MathUtil.wrap(currentIndex + amount, 0, this.count);
    this.$select.val(newIndex);
    this.renderMetadata(this.transcripts[newIndex]);
  }
}