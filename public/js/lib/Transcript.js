class Transcript {
  constructor(options = {}) {
    const defaults = {
      el: '#transcript',
      onEnterClip: (clip) => { console.log(clip); },
      spacingMax: 24,
      spacingMin: 12,
    };
    this.options = _.extend({}, defaults, options);
    this.init();
  }

  init() {
    this.isLoading = false;
    this.loadedId = false;
    this.$el = $(this.options.el);
  }

  getClipFromElement($el) {
    if (this.isLoading || this.loadedId === false) return false;
    if (!$el.is('[data-word]')) return false;

    let clip = false;
    const i = parseInt($el.attr('data-word'), 10);
    if ($el.is('[data-phone]')) {
      const j = parseInt($el.attr('data-phone'), 10);
      clip = this.data.words[i].phones[j];
    } else {
      clip = this.data.words[i];
    }
    return clip;
  }

  getClipFromEvent(event) {
    const $el = $(event.currentTarget);
    return this.getClipFromElement($el);
  }

  loadFromURL(url) {
    this.loadPromise = $.Deferred();
    if (url === this.loadedId) return this.loadPromise.resolve(url).promise();
    this.isLoading = true;
    $.getJSON(url, (data) => this.onLoad(url, data));
    return this.loadPromise;
  }

  onLoad(url, data) {
    this.data = this.constructor.parseData(data);
    this.isLoading = false;
    this.loadedId = url;
    this.render();
    this.loadPromise.resolve(url);
  }

  static parseData(data) {
    const pdata = data;
    pdata.words = pdata.words.map((word, i) => {
      const pword = word;
      pword.index = i;
      pword.id = `w${i}`;
      pword.type = 'word';
      pword.text = pword.displayText ? pword.displayText : pword.text;
      pword.durBefore = 0;
      if (i > 0) pword.durBefore = word.start - pdata.words[i - 1].end;
      pword.phones = word.phones.map((phone, j) => {
        const pphone = phone;
        pphone.id = `p${i}-${j}`;
        pphone.type = 'phone';
        pphone.dur = phone.end - phone.start;
        return pphone;
      });
      return pword;
    });
    return pdata;
  }

  render() {
    const d = this.data;
    let html = '';
    html += '<div class="text">';
    d.words.forEach((w, i) => {
      if (w.prepend) {
        html += `<div class="non-word prepend">${w.prepend}</div>`;
      }
      html += `<div class="word-wrapper" data-index="${i}">`;
      w.phones.forEach((p, j) => {
        let className = 'clip phone';
        if (j === 0) className += ' first';
        if (j === w.phones.length - 1) className += ' last';
        html += `<button id="${p.id}" class="${className}" data-word="${i}" data-phone="${j}">`;
        html += `<span class="original-text">${p.displayText}</span>`;
        html += `<span class="ghost-text">${p.displayText}</span>`;
        html += `<span class="phone-text">${p.text}</span>`;
        html += '</button>'; // .phone
      });
      html += `<button id="${w.id}" class="clip word" data-word="${i}">`;
      html += `<span class="visually-hidden">${w.text}</span>`;
      html += '</button>'; // .word
      html += '</div>'; // .word-wrapper
      if (w.append) {
        html += `<div class="non-word append">${w.append}</div>`;
      }
    });
    html += '</div>'; // .text
    this.$el.html(html);
  }
}
