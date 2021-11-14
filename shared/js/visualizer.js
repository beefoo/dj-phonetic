var Visualizer = (function() {

  function Visualizer(config) {
    var defaults = {
      el: '#visualizer',
      mode: 'spectrogram',
      colorPalette: 'inferno',
      minBarwidth: 0.1
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

    this.app = app;
    this.graphics = graphics;
    this.colorPalette = colorPalette;
  };

  Visualizer.prototype.loadListeners = function(){
    $(window).on('resize', () => this.onResize());
  };

  Visualizer.prototype.onResize = function(){
    if (!this.analyzer) return;

    this.visualize(this.analyzer);
  };

  Visualizer.prototype.renderRMS = function(analyzer){
    var dataCount = analyzer.rms.length;
    var valueMax = analyzer.rmsMax;
    var canvasW = this.app.view.width
    var canvasH = this.app.view.height;
    var graphics = this.graphics;
    var colorPalette = this.colorPalette;
    var colorCount = this.colorPalette.length;
    var minBarwidth = this.opt.minBarwidth;

    var dataWidth = Math.max(canvasW / dataCount, minBarwidth);
    var dataSteps = Math.min(dataCount, Math.floor(canvasW/dataWidth));
    for (var i=0; i<dataSteps; i++) {
      var x = i * dataWidth;
      var t = i / (dataSteps-1);
      var valueIndex = Math.round(t * (dataCount-1));
      var value = analyzer.rms[valueIndex];
      var valueN = value / valueMax;
      var dataHeight = valueN * canvasH;
      var y = canvasH - dataHeight;

      var colorIndex = Math.round(valueN * (colorCount-1));
      graphics.beginFill(colorPalette[colorIndex]);
      graphics.drawRect(x, y, dataWidth, dataHeight);
      graphics.endFill();
    }

  };

  Visualizer.prototype.visualize = function(analyzer){
    var g = this.graphics;
    this.analyzer = analyzer;

    g.clear();
    this.renderRMS(analyzer);
  };

  return Visualizer;

})();
