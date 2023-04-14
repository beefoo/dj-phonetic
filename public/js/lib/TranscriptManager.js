class TranscriptManager {
  constructor(options = {}) {
    const defaults = {
      transcripts: [],
    };
    this.options = _.extend({}, defaults, options);
    this.init();
  }

  init() {
    this.transcripts = this.options.transcripts;
    this.constructor.renderTranscripts(this.transcripts);
  }

  static renderTranscripts(transcripts) {
    const $select = $('#transcript-select');
    let html = '';
    transcripts.forEach((transcript, i) => {
      const selected = i <= 0 ? ' selected' : '';
      html += `<option value="${i}"${selected}>${transcript.title}</option>`;
    });
    $select.html(html);
  }
}
