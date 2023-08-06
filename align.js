const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const config = require('./config.json');

const { argv } = yargs(hideBin(process.argv));

function processQueue(files) {
  // create temporary directory
  const tmpDir = path.join(config.audioDirectoryQueue, `${Date.now()}/`);
  const audioTargetDir = path.join(tmpDir, 'audio/');
  const alignedTargetDir = path.join(tmpDir, 'aligned/');
  fs.mkdirSync(audioTargetDir, { recursive: true });
  fs.mkdirSync(alignedTargetDir, { recursive: true });
  // copy files over
  files.forEach((srcFilename) => {
    const destFilename = path.join(audioTargetDir, path.basename(srcFilename));
    fs.copyFileSync(srcFilename, destFilename);
  });
  // run alignment
  const args = ['align', '--fine_tune', '--clean', '--include_original_text', '--overwrite', audioTargetDir, 'english_us_arpa', 'english_us_arpa', alignedTargetDir];
  console.log(`Running: mfa ${args.join(' ')}`);
  spawnSync('mfa', args);
  // move synced files over
  const alignedFiles = fs.readdirSync(alignedTargetDir);
  let count = 0;
  alignedFiles.forEach((filename) => {
    const srcFilename = path.join(alignedTargetDir, filename);
    const destFilename = path.join(config.textgridDirectoryIn, filename);
    if (!fs.existsSync(destFilename) || argv.overwrite) {
      fs.copyFileSync(srcFilename, destFilename);
      count += 1;
    }
  });
  console.log(`Moved ${count} aligned files to ${config.textgridDirectoryIn}`);
  count = 0;
  files.forEach((srcFilename) => {
    const destFilename = path.join(config.audioDirectoryIn, path.basename(srcFilename));
    if (!fs.existsSync(destFilename) || argv.overwrite) {
      fs.copyFileSync(srcFilename, destFilename);
      count += 1;
    }
  });
  console.log(`Moved ${count} audio/txt files to ${config.audioDirectoryIn}`);
  // remove temporary files
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

function main() {
  const files = fs.readdirSync(config.audioDirectoryQueue);
  const audioFiles = files.filter((file) => path.extname(file).toLowerCase() === '.wav');
  const queue = [];
  audioFiles.forEach((audioFilename) => {
    const audioPath = path.join(config.audioDirectoryQueue, audioFilename);
    const textPath = `${audioPath.slice(0, -4)}.txt`;
    if (!fs.existsSync(textPath)) {
      console.log(`Could not find text file ${textPath}`);
    } else {
      queue.push(audioPath, textPath);
    }
  });
  processQueue(queue);
  console.log('Done.');
}

main();
