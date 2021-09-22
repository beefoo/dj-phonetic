var Analyzer = (function() {

  function Analyzer(config) {
    var defaults = {};
    this.opt = _.extend({}, defaults, config);

    this.init();
  }

  Analyzer.prototype.init = function(){

  };

  Analyzer.prototype.analyze = function(audioBuffer){
    var monoChannel = audioBuffer.getChannelData(0)
    var bufferSize = 2048
    Meyda.bufferSize = bufferSize

    var numChunks = Math.floor(monoChannel.length / bufferSize)
    var lengthPerChunk = monoChannel.length / audioBuffer.sampleRate / numChunks * 1000;  //in milliseconds
    console.log(lengthPerChunk + ' ms per chunk.');

    var dataChunks = []
    console.log('Analyzing audio chunks...');
    for(var i = 0; i < numChunks; i++) {
        var chunk = monoChannel.slice(i*bufferSize, (i+1)*bufferSize)
        var result = Meyda.extract('amplitudeSpectrum', chunk)
        dataChunks.push(result)
    }
    console.log(dataChunks[0]);
  };

  return Analyzer;

})();
