module.exports = {
  emptyDirectory(fs, dirName) {
    fs.readdirSync(dirName, (readErr, files) => {
      if (readErr) throw readErr;
      files.forEach((file, i) => {
        fs.unlinkSync(path.join(dirName, file), (unlinkErr) => {
          if (unlinkErr) throw unlinkErr;
        });
      });
    });
    console.log(`Emptied ${dirName}`);
  },

  isVowel(text) {
    let ntext = text;
    ntext = ntext.replace(/[^a-z]/gi, '');
    if (!ntext || ntext.length <= 0) return false;
    const firstChar = ntext[0].toLowerCase();
    return ['a', 'e', 'i', 'o', 'u'].indexOf(firstChar) >= 0;
  },

  norm(value, a, b) {
    const denom = (b - a);
    if (denom > 0 || denom < 0) return (1.0 * value - a) / denom;
    return 0;
  },

  readCSV(fs, csv, filename, onFinished) {
    const rows = [];
    fs.createReadStream(filename)
      .pipe(csv())
      .on('data', (data) => rows.push(data))
      .on('end', () => {
        onFinished(rows);
        console.log(`Read ${rows.length} rows from ${filename}`);
      });
  },

  readFile(fs, filename) {
    return fs.readFileSync(filename, {
      encoding: 'utf8',
    });
  },

  writeFile(fs, filename, content) {
    fs.writeFile(filename, content, (err) => {
      if (err) throw err;
      console.log(`Wrote to ${filename}`);
    });
  },

  writeJSON(fs, filename, data) {
    const jsonString = JSON.stringify(data);
    this.writeFile(fs, filename, jsonString);
  },
};
