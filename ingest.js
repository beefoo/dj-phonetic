const _ = require('underscore');
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

const audioFiles = fs.readdirSync(config.audioDirectoryIn);
const textgridFiles = fs.readdirSync(config.textgridDirectoryIn);
const allFiles = audioFiles.concat(textgridFiles);
const files = [];

// retrieve files from audio directory
allFiles.forEach((file) => {
  const fileParts = path.parse(file);
  const id = fileParts.name;
  const type = fileParts.ext.slice(1).toLowerCase();
  if (type === '') return;
  const filePath = config.audioDirectoryIn + file;
  let fileIndex = files.findIndex((f) => f.id === id);
  if (fileIndex < 0) {
    const newFile = { id, valid: true };
    files.push(newFile);
    fileIndex = files.length - 1;
  }
  if (type === 'textgrid') files[fileIndex].textgrid = config.textgridDirectoryIn + file;
  else if (config.validAudioFilesExt.find((ext) => ext === type)) files[fileIndex].audio = filePath;
  else if (config.validTextFileExt.find((ext) => ext === type)) files[fileIndex].text = filePath;
});

// validate files
function isValidFile(f) {
  return _.has(f, 'textgrid') && _.has(f, 'text') && _.has(f, 'audio');
}
const validFiles = files.filter((f) => isValidFile(f));
const invalidFiles = files.filter((f) => !isValidFile(f));
if (invalidFiles.length > 0) {
  console.log(`Removed ${invalidFiles.length} items because they did not have all of the following: TextGrid file, text file, audio file:`);
  console.log(_.pluck(invalidFiles, 'id').map((id) => ` - ${id}`));
}

// validate and process textgrid
function parseInterval(interval) {
  const item = {};
  item.text = interval.text;
  item.start = parseFloat(interval.xmin);
  item.end = parseFloat(interval.xmax);
  return item;
}
_.each(validFiles, (f, i) => {
  const textgridString = utils.readFile(fs, f.textgrid);
  const textString = utils.readFile(fs, f.text);
  const tg = textgrid.TextGrid.textgridToJSON(textgridString);

  // read words
  const words = tg.items.find((item) => item.name === 'words');
  if (!words) {
    console.log(`Missing words in ${f.textgrid}`);
    validFiles[i].valid = false;
    return;
  }
  const processedWords = words.intervals.map((interval) => parseInterval(interval));

  // read phones
  const phones = tg.items.find((item) => item.name === 'phones');
  if (!phones) {
    console.log(`Missing phones in ${f.textgrid}`);
    validFiles[i].valid = false;
    return;
  }
  const processedPhones = phones.intervals.map((interval) => parseInterval(interval));
});
