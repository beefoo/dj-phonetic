const _ = require('underscore');
const csv = require('csv-parser');
const fs = require('fs');
const meyda = require('meyda');
const { spawnSync } = require('child_process');
const textgrid = require('textgrid');
const wav = require('node-wav');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const config = require('./config.json');
const utils = require('./utils');

const { argv } = yargs(hideBin(process.argv));

// remove existing output if -clean is passed in
if (argv.clean) {
  utils.emptyDirectory(fs, config.audioDirectoryOut);
}

function parseRows(rows) {
  const items = [];
  rows.forEach((row) => {
    const audioFn = `${config.audioDirectoryIn}${row.audio}`;
    const textFn = `${config.textDirectoryIn}${row.id}.txt`;
    const textgridFn = `${config.textgridDirectoryIn}${row.id}.TextGrid`;

    if (!fs.existsSync(audioFn)) {
      console.log(`Could not find audio file ${audioFn}`);
      return;
    }

    if (!fs.existsSync(textFn)) {
      console.log(`Could not find text file ${textFn}`);
      return;
    }

    if (!fs.existsSync(textgridFn)) {
      console.log(`Could not find textgrid file ${textgridFn}`);
      return;
    }

    const item = _.clone(row);
    item.audio = audioFn;
    item.text = textFn;
    item.textgrid = textgridFn;
    items.push(item);
  });
  return items;
}

// validate and process textgrid
function parseInterval(interval) {
  const item = {};
  item.text = interval.text;
  item.start = parseFloat(interval.xmin);
  item.end = parseFloat(interval.xmax);
  return item;
}
// add phones to to word
function addPhones(word, phones) {
  const updatedWord = _.clone(word);
  updatedWord.phones = phones.filter((p) => p.start >= word.start && p.end <= word.end);
  return updatedWord;
}
function parseItems(items) {
  const parsedItems = [];
  items.forEach((item, i) => {
    const textgridString = utils.readFile(fs, item.textgrid);
    const textString = utils.readFile(fs, item.text);
    const tg = textgrid.TextGrid.textgridToJSON(textgridString);

    // read phones
    const tgPhones = tg.items.find((tgItem) => tgItem.name === 'phones');
    if (!tgPhones) {
      console.log(`Missing phones in ${item.textgrid}`);
      return;
    }
    const phones = tgPhones.intervals.map((interval) => parseInterval(interval));

    // read words
    const tgWords = tg.items.find((tgItem) => tgItem.name === 'words');
    if (!tgWords) {
      console.log(`Missing words in ${item.textgrid}`);
      return;
    }
    let words = tgWords.intervals.map((interval) => parseInterval(interval));
    words = words.map((word) => addPhones(word, phones));
    // remove blanks
    words = words.filter((word) => word.text.trim().length > 0);
    // add display text and non-word text from original text
    let refText = textString;
    words.forEach((w, j) => {
      const foundIndex = refText.toLowerCase().indexOf(w.text);
      if (foundIndex < 0) {
        console.log(`Could not find word ${w.text} in original text`);
        return;
      }
      // check for non-word string before found word
      if (foundIndex > 0) {
        let nonWordText = refText.slice(0, foundIndex);
        if (nonWordText.trim().length > 0) {
          const spaceAtStart = nonWordText.startsWith(' ');
          const spaceAtEnd = nonWordText.endsWith(' ');
          const prepend = nonWordText.length > 1 && spaceAtStart && !spaceAtEnd;
          const appendAndPrepend = nonWordText.length > 2 && !spaceAtStart && !spaceAtEnd && nonWordText.includes(' ') && j > 0;
          nonWordText = nonWordText.trim();
          // e.g. He said: "Hello" (prepend _"_ to _Hello_ and append _:_ to _said_)
          if (appendAndPrepend) {
            const [firstPart, lastPart] = nonWordText.split(' ', 2);
            words[j].prepend = lastPart;
            words[j - 1].append = firstPart;
          } else if (prepend || j === 0) {
            words[j].prepend = nonWordText;
          } else {
            words[j - 1].append = nonWordText;
          }
        }
        refText = refText.slice(foundIndex);
      }
      // check to see if display text is different from text
      const displayText = refText.slice(0, w.text.length);
      if (displayText !== w.text) {
        words[j].displayText = displayText;
      }
      refText = refText.slice(w.text.length);
    });
    // words.forEach((w) => {
    //   const text = w.displayText ? w.displayText : w.text;
    //   console.log(text);
    //   if (w.prepend) console.log(`Prepend text: ${w.prepend}`);
    //   if (w.append) console.log(`Append text: ${w.append}`);
    //   console.log(_.pluck(w.phones, 'text'));
    //   console.log('------------------');
    // });
    const parsedItem = item;
    parsedItem.words = words;
    parsedItems.push(parsedItem);
  });
  return parsedItems;
}

function removePhones(oldPhones, count) {
  let phones = oldPhones.slice(0);
  phones.forEach((phone, i) => {
    phones[i].index = i;
  });
  phones = _.sortBy(phones, (p) => p.end - p.start);
  phones = phones.slice(count);
  phones = _.sortBy(phones, 'index');
  phones = phones.map((p) => _.omit(p, 'index'));
  return phones;
}
function alignPhones(items) {
  return items.map((item, i) => {
    const alignedItem = _.clone(item);
    alignedItem.words = item.words.map((word, j) => {
      const alignedWord = _.clone(word);
      const wText = word.displayText ? word.displayText : word.text;
      const chars = wText.split('');
      // merge non-alpha chars into the previous alpha letter
      const nchars = [];
      chars.forEach((c, k) => {
        if (!c.match(/[a-z]/i)) {
          const lastIndex = nchars.length - 1;
          if (k > 0) nchars[lastIndex] = nchars[lastIndex].concat(c);
        } else {
          nchars.push(c);
        }
      });
      // check if there are more phones than letters (shouldn't happen)
      if (nchars.length < alignedWord.phones.length) {
        console.log(`${wText} has more phones than letters:`);
        console.log(_.pluck(alignedWord.phones, 'text'));
        console.log('Make sure you are not using abbreviations or numerals');
        // remove the shortest phones for now
        const removeCount = alignedWord.phones.length - nchars.length;
        alignedWord.phones = removePhones(alignedWord.phones, removeCount);
      }
      // add blanks
      alignedWord.phones.forEach((phone, k) => {
        alignedWord.phones[k].displayText = '';
      });
      // attempt to align phones to letters
      let isFinished = false;
      const phoneCount = alignedWord.phones.length;
      const letterCount = nchars.length;
      let phoneIndex = 0;
      nchars.forEach((char, k) => {
        if (isFinished) return;
        // if # remaining phones match the # remaining letters, map them 1-to-1
        const remainingPhones = phoneCount - phoneIndex;
        const remainingLetters = letterCount - k;
        if (remainingPhones === remainingLetters) {
          _.times(remainingPhones, (m) => {
            const currentText = alignedWord.phones[phoneIndex + m].displayText;
            alignedWord.phones[phoneIndex + m].displayText = currentText.concat(nchars[k + m]);
          });
          isFinished = true;
          return;
        }
        const phone = alignedWord.phones[phoneIndex];
        const isFirstPhone = phoneIndex === 0;
        const isLastPhone = phoneIndex >= phoneCount - 1;
        const isLastLetter = k >= letterCount - 1;
        const isPhoneVowel = utils.isVowel(phone.text);
        const isLetterVowel = utils.isVowel(char);
        const lastPhoneText = alignedWord.phones[phoneCount - 1].displayText;
        const lastPhoneTextSet = lastPhoneText.length > 0;
        const isMatch = isPhoneVowel === isLetterVowel;
        // type of phone doesn't match the type of letter, add to previous
        if (!isMatch && !isFirstPhone && !isLastLetter
            && !(isLastPhone && lastPhoneTextSet) // always update last phone if already set
        ) {
          const prevText = alignedWord.phones[phoneIndex - 1].displayText;
          alignedWord.phones[phoneIndex - 1].displayText = prevText.concat(char);
        // we have a match, add to current phone
        } else {
          const currentText = alignedWord.phones[phoneIndex].displayText;
          alignedWord.phones[phoneIndex].displayText = currentText.concat(char);
          if (!isLastPhone) phoneIndex += 1;
        }
      });
      // acount for special cases
      alignedWord.phones.forEach((phone, k) => {
        const text = phone.displayText;
        const phoneText = phone.text;
        const isLastPhone = k === alignedWord.phones.length - 1;
        config.phoneticRules.forEach((rule) => {
          if (isLastPhone) return;
          if (!phoneText.startsWith(rule.phone)) return;
          const ltext = text.toLowerCase();
          if (rule.validText.indexOf(ltext) >= 0) return;
          const nextText = alignedWord.phones[k + 1].displayText;
          const combinedText = text.concat(nextText);
          const lcombinedText = combinedText.toLowerCase();
          let isMatch = false;
          rule.validText.forEach((validText) => {
            if (isMatch) return;
            if (lcombinedText.length > validText.length && lcombinedText.startsWith(validText)) {
              isMatch = true;
              alignedWord.phones[k].displayText = combinedText.slice(0, validText.length);
              alignedWord.phones[k + 1].displayText = combinedText.slice(validText.length);
            }
          });
        });
      });
      return alignedWord;
    });
    return alignedItem;
  });
}

function mapPhones(items, mappings) {
  const mappedItems = items.slice(0);
  items.forEach((item, i) => {
    item.words.forEach((word, j) => {
      word.phones.forEach((phone, k) => {
        const phoneText = phone.text.replace(/[^a-z]/gi, '');
        if (_.has(mappings, phoneText)) {
          mappedItems[i].words[j].phones[k].text = mappings[phoneText];
        }
      });
    });
  });
  return mappedItems;
}

function analyzeAudio(items) {
  const analyzedItems = [];
  const chromaPitches = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  items.forEach((item, i) => {
    const analyzedItem = _.clone(item);
    const audioBuffer = fs.readFileSync(item.audio);
    const audioData = wav.decode(audioBuffer);
    const { sampleRate, channelData } = audioData;
    const monoChannelData = channelData[0];
    meyda.sampleRate = sampleRate;
    const loudnessData = [];
    const tonalityData = [];
    item.words.forEach((word, j) => {
      word.phones.forEach((phone, k) => {
        const { start, end } = phone;
        const phoneDur = end - start;
        const phoneSamples = phoneDur * sampleRate;
        const nearestPowerOfTwo = Math.round(Math.log(phoneSamples) / Math.log(2));
        const bufferSize = 2 ** nearestPowerOfTwo;
        meyda.bufferSize = bufferSize;
        let indexStart = Math.floor(start * sampleRate);
        let indexEnd = indexStart + bufferSize;
        if (indexEnd >= monoChannelData.length) {
          indexEnd = monoChannelData.length - 1;
          indexStart = indexEnd - bufferSize;
        }
        const signal = monoChannelData.slice(indexStart, indexEnd);
        const features = meyda.extract(['energy', 'spectralKurtosis', 'chroma'], signal);
        analyzedItem.words[j].phones[k].loudness = features.energy;
        analyzedItem.words[j].phones[k].tonality = features.spectralKurtosis;
        loudnessData.push(features.energy);
        tonalityData.push(features.spectralKurtosis);
        const chroma = _.zip(chromaPitches, features.chroma);
        const chromaEstimate = _.max(chroma, (c) => c[1]);
        analyzedItem.words[j].phones[k].pitch = chromaEstimate[0];
      });
    });
    // normalize data
    const minLoudness = _.min(loudnessData);
    const maxLoudness = _.max(loudnessData);
    const minTonality = _.min(tonalityData);
    const maxTonality = _.max(tonalityData);
    analyzedItem.words.forEach((word, j) => {
      word.phones.forEach((phone, k) => {
        const nLoudness = utils.norm(phone.loudness, minLoudness, maxLoudness);
        analyzedItem.words[j].phones[k].loudness = nLoudness;
        const nTonality = utils.norm(phone.tonality, minTonality, maxTonality);
        analyzedItem.words[j].phones[k].tonality = nTonality;
      });
    });
    analyzedItems.push(analyzedItem);
  });
  return analyzedItems;
}

function writeDataFiles(items) {
  items.forEach((item, i) => {
    const filename = `${config.audioDirectoryOut}${item.id}.json`;
    utils.writeJSON(fs, filename, _.omit(item, 'audio', 'text', 'textgrid'));
  });
}

function convertAudioFiles(items) {
  items.forEach((item, i) => {
    const fnIn = item.audio;
    const fnOut = `${config.audioDirectoryOut}${item.id}.mp3`;
    if (fs.existsSync(fnOut)) return;
    const args = ['-i', fnIn, '-b:a', '128k', fnOut];
    spawnSync('ffmpeg', args);
  });
}

utils.readCSV(fs, csv, config.metadataFile, (rows) => {
  let items = parseRows(rows);
  console.log('Parsing textgrid data...');
  items = parseItems(items);
  items = alignPhones(items);
  items = mapPhones(items, config.arpabet);
  console.log('Analyzing audio...');
  items = analyzeAudio(items);
  writeDataFiles(items);
  console.log('Converting audio files...');
  convertAudioFiles(items);
  console.log('Done.');
});
