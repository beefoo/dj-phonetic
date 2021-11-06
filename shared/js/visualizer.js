var Visualizer = (function() {

  function Visualizer(config) {
    var defaults = {
      el: '#visualizer',
      mode: 'spectrogram',
      colorPalette: 'inferno'
    };
    this.opt = _.extend({}, defaults, config);

    this.init();
  }

  Visualizer.prototype.init = function(){
    this.$el = $(this.opt.el);
    this.loadCanvas();
    this.loadListeners();
  };

  Visualizer.prototype.loadCanvas = function(){
    var canvas = this.$el[0];
    canvas.width = 800;
    canvas.height = 600;

    var fs = fragmentShaders[this.opt.mode];
    var shader = new Shader2D({
      canvas: canvas,
      fsSource: fs
    });
    shader.draw();

    var colorPalette = colorPalettes[this.opt.colorPalette];
  };

  Visualizer.prototype.loadListeners = function(){

  };

  Visualizer.prototype.visualize = function(analyzer){

  };

  return Visualizer;

})();
