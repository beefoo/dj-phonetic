var Loader = (function() {

  function Loader(config) {
    var defaults = {
      selectLocalFileEl: '.audio-file-select',
      selectUrlEl: '.audio-url-select',
      fileDropEl: '.file-droppable',
      onAudioLoaded: function(audioBuffer){}
    };
    this.opt = _.extend({}, defaults, config);

    this.init();
  }

  Loader.prototype.init = function(){
    this.audioLoaded = false;
    this.loading = false;
    this.loadListeners();
  };

  Loader.prototype.loadFileFromLocal = function(file){
    this.audioLoaded = false;
    this.loading = true;

    var reader = new FileReader();
    reader.onload = (e) => {
      this.onLoadAudioData(e.target.result);
    };

    console.log('Reading local file...');
    reader.readAsArrayBuffer(file);
  };

  Loader.prototype.loadFileFromUrl = function(url){
    this.audioLoaded = false;
    this.loading = true;

    console.log('Retrieving audio file from URL ', url);
    fetch(url).then((response) => response.arrayBuffer()).then((audioData) => {
      this.onLoadAudioData(audioData);
    });
  };

  Loader.prototype.loadListeners = function(){
    var _this = this;

    var onFileSelect = (files) => {
      console.log('Local file select: ', files);
      if (files.length < 1) return;
      var selectedFile = files[0];
      this.loadFileFromLocal(selectedFile);
    };

    $(this.opt.selectLocalFileEl).on('change', function(e){
      onFileSelect(this.files);
    });

    $(this.opt.selectUrlEl).on('click', function(e){
      _this.loadFileFromUrl($(this).attr('data-url'));
    });

    $(this.opt.fileDropEl).on('dragover', function(e) {
      e.preventDefault();
      e.stopPropagation();
      $(this).addClass('dragging');
    });

    $(this.opt.fileDropEl).on('dragleave', function(e) {
      e.preventDefault();
      e.stopPropagation();
      $(this).removeClass('dragging');
    });

    $(this.opt.fileDropEl).on('drop', function(e){
      e.preventDefault();
      e.stopPropagation();
      onFileSelect(e.originalEvent.dataTransfer.files);
    });
  };

  Loader.prototype.onLoadAudioData = function(audioData){
    this.audioContext = new AudioContext();

    // Decode audio
    console.log('Decoding audio...');

    this.audioContext.decodeAudioData(audioData).then((buffer) => {
      this.audioSource = this.audioContext.createBufferSource();
      this.audioSource.buffer = buffer;
      this.audioLoaded = true;
      this.loading = false;
      this.opt.onAudioLoaded(this.audioSource.buffer);

    });
  };

  return Loader;

})();
