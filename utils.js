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
};
