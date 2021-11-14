'use strict';

var App = (function() {

  function App(config) {
    var defaults = {};
    var q = Util.queryParams();
    this.opt = _.extend({}, defaults, config, q);
    this.init();
  }

  App.prototype.init = function(){
    this.visualizer = new Visualizer();

    this.analyzer = new Analyzer({
      onAnalysisFinished: (analyzer) => {
        this.visualizer.visualize(analyzer);
      }
    });

    var loader = new Loader({
      onAudioLoaded: (audioBuffer) => {
        this.analyzer.analyze(audioBuffer);
      }
    });

    var recorder = new MicRecorder({
      onAudioRecorded: (audioBuffer) => {
        this.analyzer.analyze(audioBuffer);
      }
    });
  };

  return App;

})();

$(function() {
  var app = new App({});
});