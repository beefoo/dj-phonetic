module.exports = {
  extractFeatures(meyda, channelData, sampleRate, start, end, featureList) {
    const dur = end - start;
    const samples = dur * sampleRate;
    const nearestPowerOfTwo = Math.round(Math.log(samples) / Math.log(2));
    const bufferSize = 2 ** nearestPowerOfTwo;
    // eslint-disable-next-line no-param-reassign
    meyda.bufferSize = bufferSize;
    let indexStart = Math.floor(start * sampleRate);
    let indexEnd = indexStart + bufferSize;
    if (indexEnd >= channelData.length) {
      indexEnd = channelData.length - 1;
      indexStart = indexEnd - bufferSize;
    }
    const signal = channelData.slice(indexStart, indexEnd);
    const features = meyda.extract(featureList, signal);
    return features;
  },
};
