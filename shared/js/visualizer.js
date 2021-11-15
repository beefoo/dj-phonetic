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

  Visualizer.prototype.renderData = function(analyzer, dataKey){
    var data = analyzer[dataKey];
    var dataCount = data.length;
    var valueMax = _.max(data);
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
      var value = data[valueIndex];
      var valueN = value / valueMax;
      var dataHeight = valueN * canvasH;
      var y = canvasH - dataHeight;

      var colorIndex = Math.round(Math.max(0.2, valueN) * (colorCount-1));
      graphics.beginFill(colorPalette[colorIndex]);
      graphics.drawRect(x, y, dataWidth, dataHeight);
      graphics.endFill();
    }

  };

  // https://github.com/meandavejustice/draw-wave/blob/master/index.js
  Visualizer.prototype.renderWaveform = function(analyzer){
    var data = analyzer.audioBuffer.getChannelData(0);
    var dataLen = data.length;
    var canvasW = this.app.view.width
    var canvasH = this.app.view.height;
    var graphics = this.graphics;
    var colorPalette = this.colorPalette;
    var color = colorPalette[colorPalette.length-1];

    graphics.beginFill(0xdddddd);
    var step = Math.ceil( dataLen / canvasW );
    var amp = canvasH / 2;
    for(var i=0; i < canvasW; i++){
      var min = 1.0;
      var max = -1.0;
      for (var j=0; j<step; j++) {
          var datum = data[(i*step)+j];
          if (datum < min)
              min = datum;
          if (datum > max)
              max = datum;
      }
      var x = i;
      var y = (1+min)*amp;
      var dataWidth = 1;
      var dataHeight = Math.max(1,(max-min)*amp);
      graphics.drawRect(x, y, dataWidth, dataHeight);
    }
    graphics.endFill();
  };

  Visualizer.prototype.visualize = function(analyzer){
    var g = this.graphics;
    this.analyzer = analyzer;

    g.clear();
    this.renderWaveform(analyzer);
  };

  return Visualizer;

})();
