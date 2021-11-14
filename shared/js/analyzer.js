var Analyzer = (function() {

  function Analyzer(config) {
    var defaults = {
      bufferSize: 2048,
      onAnalysisFinished: function(analyzer){}
    };
    this.opt = _.extend({}, defaults, config);

    this.init();
  }

  Analyzer.prototype.init = function(){

  };

  Analyzer.prototype.analyze = function(audioBuffer){
    var monoChannel = audioBuffer.getChannelData(0);
    bufferSize = this.opt.bufferSize;
    Meyda.bufferSize = bufferSize;

    var numChunks = Math.floor(monoChannel.length / bufferSize);
    var duration = monoChannel.length / audioBuffer.sampleRate; // in seconds
    var lengthPerChunk = duration / numChunks * 1000;  //in milliseconds
    console.log('Total duration: '+Util.formatDuration(duration));
    console.log(numChunks + ' chunks at ' + lengthPerChunk + ' ms per chunk.');

    var spectrumChunks = new Array(numChunks);
    var rmsChunks = new Float32Array(numChunks);
    console.log('Analyzing audio chunks...');
    for(var i = 0; i < numChunks; i++) {
      var chunk = monoChannel.slice(i*bufferSize, (i+1)*bufferSize)
      var spectrumChunk = Meyda.extract('amplitudeSpectrum', chunk);
      spectrumChunks[i] = spectrumChunk;
      var rmsValue = Meyda.extract('rms', chunk);
      rmsChunks[i] = isNaN(rmsValue) ? 0 : rmsValue;
    }

    // calculate spectral flux
    var spectralFlux = [0];
    var maxSf = 0;
    for(var i = 1; i < numChunks; i++) {
      var sf = 0;
      var signal = spectrumChunks[i];
      var previousSignal = spectrumChunks[i-1];
      for (var j = 0; j < signal.length; j++) {
          var x = Math.abs(signal[j]) - Math.abs(previousSignal[j]);
          sf += (x + Math.abs(x)) / 2;
      }
      spectralFlux.push(sf);
      maxSf = Math.max(maxSf, sf);
    }

    this.audioBuffer = audioBuffer;
    this.spectrum = spectrumChunks;
    this.spectralFlux = spectralFlux;
    this.spectralFluxMax = maxSf;
    this.rms = rmsChunks;
    this.rmsMax = _.max(rmsChunks);

    this.opt.onAnalysisFinished(this);
  };

  return Analyzer;

})();
