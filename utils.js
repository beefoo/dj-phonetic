module.exports = {
  ease(n) {
    return (Math.sin((n + 1.5) * Math.PI) + 1.0) / 2.0;
  },

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
    if (typeof text !== 'string') return false;
    let ntext = text;
    ntext = ntext.replace(/[^a-z]/gi, '');
    if (!ntext || ntext.length <= 0) return false;
    const firstChar = ntext[0].toLowerCase();
    return ['a', 'e', 'i', 'o', 'u'].indexOf(firstChar) >= 0;
  },

  lerp(a, b, percent) {
    return (1.0 * b - a) * percent + a;
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

  roundToPrecision(value, precision) {
    return parseFloat(value.toFixed(precision));
  },

  writeFile(fs, filename, content) {
    fs.writeFile(filename, content, (err) => {
      if (err) throw err;
      console.log(`Wrote to ${filename}`);
    });
  },

  writeJSON(fs, filename, data, prepend = '', append = '') {
    const jsonString = `${prepend}${JSON.stringify(data)}${append}`;
    this.writeFile(fs, filename, jsonString);
  },
};
