const _ = require('underscore');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const textgrid = require('textgrid');
const config = require('./config.json');
const utils = require('./utils');

function main() {
  const files = fs.readdirSync(config.textgridDirectoryIn);
  const tgFiles = files.filter((file) => path.extname(file).toLowerCase() === '.textgrid');
  const messages = [];
  tgFiles.forEach((filename, i) => {
    const filePath = path.join(config.textgridDirectoryIn, filename);
    const textgridString = utils.readFile(fs, filePath);
    const tg = textgrid.TextGrid.textgridToJSON(textgridString);
    const tgWords = tg.items.find((tgItem) => tgItem.name === 'words');
    const tgPhones = tg.items.find((tgItem) => tgItem.name === 'phones');
    tgPhones.intervals.forEach((phone) => {
      if (phone.text === 'spn') {
        const invalidWord = tgWords.intervals.find((word) => word.xmin === phone.xmin);
        messages.push(`"${invalidWord.text}" in ${filename}`);
      }
    });
  });
  if (messages.length > 0) console.log('Invalid words found: ', _.uniq(messages));
  else console.log('No invalid words found');
}

main();
