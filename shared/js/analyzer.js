var Analyzer = (function() {

  function Analyzer(config) {
    var defaults = {};
    this.opt = _.extend({}, defaults, config);

    this.init();
  }

  Analyzer.prototype.init = function(){

  };

  Analyzer.prototype.load = function(audioContext, audioSource){
    var analyzer = Meyda.createMeydaAnalyzer({
      audioContext: audioContext,
      source: audioSource,
      bufferSize: 512,
      featureExtractors: ["rms"],
      callback: (features) => {
        this.onLoad(features);
      },
    });
    analyzer.start();
    this.analyzer = analyzer;
  };

  Analyzer.prototype.onLoad = function(features){
    console.log(features)
  };

  return Analyzer;

})();
