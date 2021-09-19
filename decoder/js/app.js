'use strict';

var App = (function() {

  function App(config) {
    var defaults = {};
    var q = Util.queryParams();
    this.opt = _.extend({}, defaults, config, q);
    this.init();
  }

  App.prototype.init = function(){
    this.analyzer = new Analyzer();
    this.selectFileLoader = new SelectFileLoader({
      onAudioLoaded: (audioContext, audioSource) => {
        this.analyzer.load(audioContext, audioSource);
      }
    });
  };

  return App;

})();

$(function() {
  var app = new App({});
});
