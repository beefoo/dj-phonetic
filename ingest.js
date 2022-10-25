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
  console.log('Analyzing audio...');
  items = analyzeAudio(items);
  writeDataFiles(items);
  console.log('Converting audio files...');
  convertAudioFiles(items);
  console.log('Done.');
});
