var SelectFileLoader = (function() {

  function SelectFileLoader(config) {
    var defaults = {
      selectEl: '.audio-file-select'
    };
    var opt = _.extend({}, defaults, config);
    Loader.call(this, opt);

    this.loadListeners();
  }

  // inherit from Loader
  SelectFileLoader.prototype = Object.create(Loader.prototype);
  SelectFileLoader.prototype.constructor = SelectFileLoader;

  SelectFileLoader.prototype.loadListeners = function(){
    var _this = this;

    $(this.opt.selectEl).on('change', function(e){
      _this.onSelectLocalFiles(this.files);
    });
  };

  return SelectFileLoader;

})();
