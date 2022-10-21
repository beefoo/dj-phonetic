const _ = require('underscore');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('node:path');
const textgrid = require('textgrid');
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

function parseItems(items) {
  const parsedItems = [];
  _.each(items, (item, i) => {
    const textgridString = utils.readFile(fs, item.textgrid);
    const textString = utils.readFile(fs, item.text);
    const tg = textgrid.TextGrid.textgridToJSON(textgridString);

    // read words
    const words = tg.items.find((tgItem) => tgItem.name === 'words');
    if (!words) {
      console.log(`Missing words in ${item.textgrid}`);
      return;
    }
    const processedWords = words.intervals.map((interval) => parseInterval(interval));

    // read phones
    const phones = tg.items.find((tgItem) => tgItem.name === 'phones');
    if (!phones) {
      console.log(`Missing phones in ${item.textgrid}`);
      return;
    }
    const processedPhones = phones.intervals.map((interval) => parseInterval(interval));
    console.log(processedPhones);
  });
  return parsedItems;
}

utils.readCSV(fs, csv, config.metadataFile, (rows) => {
  const items = parseRows(rows);
  const processedItems = parseItems(items);
});
