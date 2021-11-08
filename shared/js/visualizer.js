var Visualizer = (function() {

  function Visualizer(config) {
    var defaults = {
      el: '#visualizer',
      mode: 'spectrogram',
      colorPalette: 'inferno',
      minBarwidth: 2,
      minBarMargin: 1
    };
    this.opt = _.extend({}, defaults, config);

    this.init();
  }

  Visualizer.prototype.init = function(){
    this.$el = $(this.opt.el);
    this.el = this.$el[0];
    this.loadCanvas();
    this.loadListeners();
  };

  Visualizer.prototype.loadCanvas = function(){

    var colorPalette = colorPalettes[this.opt.colorPalette];

    var app = new PIXI.Application({
      antialias: true,
      resizeTo: this.el
    });
    this.el.appendChild(app.view);

    var graphics = new PIXI.Graphics();
    app.stage.addChild(graphics);
    this.graphics = graphics;
  };

  Visualizer.prototype.loadListeners = function(){

  };

  Visualizer.prototype.renderRMS = function(analyzer){
    var numChunks = analyzer.rms.length;
    var rmsMax = analyzer.rmsMax;


  };

  Visualizer.prototype.visualize = function(analyzer){
    var g = this.graphics;

    g.clear();
    this.renderRMS(analyzer);
  };

  return Visualizer;

})();
