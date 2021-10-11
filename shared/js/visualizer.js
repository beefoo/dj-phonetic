var Visualizer = (function() {

  function Visualizer(config) {
    var defaults = {
      el: '#app'
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
    var app = new PIXI.Application({
        width: 800,
        height: 600,
        backgroundColor: 0x000000,
        resolution: window.devicePixelRatio || 1,
    });
    document.body.appendChild(app.view);

    var container = new PIXI.Container();

    app.stage.addChild(container);
  };

  Visualizer.prototype.loadListeners = function(){
    
  };

  Visualizer.prototype.visualize = function(analyzer){

  };

  return Visualizer;

})();
