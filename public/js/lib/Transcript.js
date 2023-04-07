class Transcript {
  constructor(options = {}) {
    const defaults = {
      el: '#transcript',
      onEnterClip: (clip) => { console.log(clip); },
      spacingMax: 24,
      spacingMin: 12,
      template: '#transcript-template',
    };
    this.options = _.extend({}, defaults, options);
    this.init();
  }

  init() {
    this.isLoading = false;
    this.loadedId = false;
    this.sortValue = false;
    this.filters = {};
    this.$el = $(this.options.el);
    this.templateString = $(this.options.template).html();
  }

  filterAndSort() {
    const modifiedData = {};
    // apply sort
    if (this.sortValue !== false) {
      const [sortFeature, sortDirection] = this.sortValue;
      const phones = _.flatten(_.pluck(this.data.words, 'phones'));
      const multiplier = sortDirection === 'asc' ? 1 : -1;
      const sortedPhones = _.sortBy(phones, (phone) => multiplier * phone.features[sortFeature]);
      const wordHolder = {
        hasPrepend: false,
        hasAppend: false,
        text: false,
        index: 0,
        phones: sortedPhones,
      };
      modifiedData.words = [wordHolder];
    } else {
      modifiedData.words = this.data.words.slice(0);
    }
    // apply filters
    const { filters } = this;
    if (!_.isEmpty(filters)) {
      modifiedData.words = modifiedData.words.map((word) => {
        const w = _.clone(word);
        w.phones = word.phones.filter((phone) => {
          let valid = true;
          _.each(filters, (range, feature) => {
            const [minValue, maxValue] = range;
            if (phone.features[feature] < minValue
              || phone.features[feature] > maxValue) valid = false;
          });
          return valid;
        });
        return w;
      });
    }
    return modifiedData;
  }

  filterMax(feature, value) {
    if (!_.has(this.filters, feature)) this.filters[feature] = [0, 1];
    this.filters[feature][1] = value;
    const modifiedData = this.filterAndSort();
    this.render(modifiedData);
  }

  filterMin(feature, value) {
    if (!_.has(this.filters, feature)) this.filters[feature] = [0, 1];
    this.filters[feature][0] = value;
    const modifiedData = this.filterAndSort();
    this.render(modifiedData);
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

  getClips(startingClip = false) {
    let clips = _.flatten(_.pluck(this.data.words, 'phones'));
    if (startingClip !== false) {
      const index = _.findIndex(clips, (clip) => clip.id === startingClip.id);
      if (index >= 0) {
        clips = clips.slice(index);
      }
    }
    return clips;
  }

  getFeatures() {
    if (!this.data) return [];
    return this.data.features;
  }

  getPhraseByDuration(startingClip, duration, endSentenceWithinWords = 1) {
    const isWord = startingClip.type === 'word';
    let i = isWord ? startingClip.index : startingClip.wordIndex;
    let j = isWord ? 0 : startingClip.index;
    let phone = this.data.words[i].phones[j];
    let phraseDur = 0;
    const phones = [phone];
    while (phraseDur < duration) {
      if (i >= this.data.words.length) break;
      phone = this.data.words[i].phones[j];
      phraseDur += phone.dur;
      phones.push(phone);
      j += 1;
      if (j >= this.data.words[i].phones.length) {
        j = 0;
        i += 1;
      }
    }
    // finish the word
    if (!phone.isLast) {
      while (!phone.isLast) {
        phone = this.data.words[i].phones[j];
        phraseDur += phone.dur;
        phones.push(phone);
        j += 1;
      }
    }
    // end the sentence if within a certain amount of words
    const lastWord = this.data.words[phone.wordIndex];
    if (!lastWord.isLast) {
      const wordsLeft = (lastWord.sentenceLength - 1) - lastWord.wordIndex;
      if (wordsLeft <= endSentenceWithinWords) {
        i = phone.wordIndex + 1;
        _.times(wordsLeft, (n) => {
          const word = this.data.words[i + n];
          word.phones.forEach((p) => {
            phones.push(p);
          });
        });
      }
    }
    return phones;
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
    this.clipDataMap = {};
    this.data.words.forEach((word, i) => {
      word.phones.forEach((phone, j) => {
        this.clipDataMap[phone.id] = {
          wordIndex: i,
          phoneIndex: j,
        };
      });
    });
    // console.log(this.data);
    this.isLoading = false;
    this.loadedId = url;
    this.render(this.data);
    this.updateFontSize();
    this.loadPromise.resolve(url);
  }

  onResize() {
    this.updateFontSize();
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
      pword.isLast = i >= (pdata.words.length - 1);
      pword.hasPrepend = _.has(word, 'prepend');
      pword.hasAppend = _.has(word, 'append');
      pword.className = _.has(word, 'isNonVerbal') && word.isNonVerbal ? ' is-non-verbal' : '';
      pword.appendClassname = pword.hasAppend && /[.!?:;,]$/.test(word.append) ? ' space-after' : '';
      if (i > 0) pword.durBefore = word.start - pdata.words[i - 1].end;
      pword.phones = word.phones.map((phone, j) => {
        const pphone = phone;
        pphone.id = `p${i}-${j}`;
        pphone.index = j;
        pphone.wordIndex = i;
        pphone.type = 'phone';
        pphone.dur = phone.end - phone.start;
        pphone.isLast = j >= (word.phones.length - 1);
        // pphone.displayText = phone.displayText.replace(/(\W+)/gi, '<small>$&</small>');
        let className = '';
        if (j === 0) className += ' first';
        if (j === word.phones.length - 1) className += ' last';
        pphone.className = className;
        return pphone;
      });
      return pword;
    });

    // add sentence data
    const endOfSentenceChars = /[:;.]/g;
    const sentences = [];
    let sentence = [];
    pdata.words.forEach((word, i) => {
      if (_.has(word, 'prepend')) {
        const foundPrepend = word.prepend.search(endOfSentenceChars);
        if (foundPrepend >= 0) {
          sentences.push(sentence);
          sentence = [word];
          return;
        }
      }
      sentence.push(word);
      if (_.has(word, 'append')) {
        const foundAppend = word.append.search(endOfSentenceChars);
        if (foundAppend >= 0) {
          sentences.push(sentence);
          sentence = [];
        }
      }
    });
    if (sentence.length > 0) sentences.push(sentence);
    sentences.forEach((s, i) => {
      const sentenceLength = s.length;
      s.forEach((word, j) => {
        pdata.words[word.index].sentenceLength = sentenceLength;
        pdata.words[word.index].wordIndex = j;
      });
    });
    return pdata;
  }

  render(data) {
    const html = StringUtil.loadTemplateFromString(this.templateString, Mustache, data);
    this.$el.html(html);
  }

  setClipData(clip, key, value) {
    const clipData = this.clipDataMap[clip.id];
    this.data.words[clipData.wordIndex].phones[clipData.phoneIndex][key] = value;
  }

  sort(feature, direction) {
    this.$el.addClass('sorted');
    this.sortValue = [feature, direction];
    const modifiedData = this.filterAndSort();
    this.render(modifiedData);
  }

  sortOff() {
    this.$el.removeClass('sorted');
    this.sortValue = false;
    const modifiedData = this.filterAndSort();
    this.render(modifiedData);
  }

  updateFontSize() {
    const { $el, data } = this;
    const width = $el.width();
    const height = $el.height();
    const textRatio = 0.4; // adjust this if text height is changed
    const fontSizeRatio = 2.25; // decrease this if still overflowing
    const minTextSize = 12;
    const maxTextSize = 54;
    const text = _.reduce(data.words, (memo, word) => {
      let newText = memo;
      if (_.has(word, 'prepend')) newText += ` ${word.prepend}`;
      if (_.has(word, 'isNonVerbal')) newText += ` [${word.text}]`;
      else newText += ` ${word.text}`;
      if (_.has(word, 'append')) newText += word.append;
      return newText;
    }, '');
    const chars = text.length;
    const testWidth = width * fontSizeRatio;
    const testHeight = height * fontSizeRatio;
    let finalTextSize = minTextSize;
    for (let textSize = minTextSize; textSize <= maxTextSize; textSize += 1) {
      const textHeight = textSize / textRatio;
      const charsPerRow = Math.floor(testWidth / textSize);
      const rows = Math.ceil(chars / charsPerRow);
      const rowsHeight = rows * textHeight;
      if (rowsHeight > testHeight) {
        break;
      }
      finalTextSize = textSize;
    }
    $el.css('font-size', `${finalTextSize}px`);
  }
}
