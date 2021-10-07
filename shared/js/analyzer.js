var Analyzer = (function() {

  function Analyzer(config) {
    var defaults = {
      bufferSize: 2048
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

    var numChunks = Math.floor(monoChannel.length / bufferSize)
    var lengthPerChunk = monoChannel.length / audioBuffer.sampleRate / numChunks * 1000;  //in milliseconds
    console.log(numChunks + ' chunks at ' + lengthPerChunk + ' ms per chunk.');

    var dataChunks = []
    console.log('Analyzing audio chunks...');
    for(var i = 0; i < numChunks; i++) {
      var chunk = monoChannel.slice(i*bufferSize, (i+1)*bufferSize)
      var result = Meyda.extract('amplitudeSpectrum', chunk)
      dataChunks.push(result);
    }

    var spectralFlux = [0];
    var maxSf = 0;
    for(var i = 1; i < numChunks; i++) {
      var sf = 0;
      var signal = dataChunks[i];
      var previousSignal = dataChunks[i-1];
      for (var j = 0; j < signal.length; j++) {
          var x = Math.abs(signal[j]) - Math.abs(previousSignal[j]);
          sf += (x + Math.abs(x)) / 2;
      }
      spectralFlux.push(sf);
      maxSf = Math.max(maxSf, sf);
    }
    console.log(maxSf);
    console.log(spectralFlux);
  };

  return Analyzer;

})();
