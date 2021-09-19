var Loader = (function() {

  function Loader(config) {
    var defaults = {
      parentEl: '#app',
      audioEl: '#audio-file-player',
      onAudioLoaded: function(audioContext, audioSource){}
    };
    this.opt = _.extend({}, defaults, config);

    this.init();
  }

  Loader.prototype.init = function(){
    this.$parent = $(this.opt.parentEl);
    this.$audio = $(this.opt.audioEl);
    this.audio = this.$audio[0];
    this.audioLoaded = false;

    this.$audio.on('canplay', () => {
      this.onAudioLoaded();
    });
  };

  Loader.prototype.loadFileFromUrl = function(url){
    this.audioLoaded = false;
    this.$audio.attr('src', url);
  };

  Loader.prototype.onAudioLoaded = function(){
    //this.audio.play();
    this.audioContext = new AudioContext();
    this.audioSource = this.audioContext.createMediaElementSource(this.audio);
    this.audioSource.connect(this.audioContext.destination);
    this.opt.onAudioLoaded(this.audioContext, this.audioSource);
    this.audioLoaded = true;
  };

  Loader.prototype.onSelectLocalFiles = function(files){
    console.log('Local file select: ', files);
    if (files.length < 1) return;

    var selectedFile = files[0];
    var fileUrl = URL.createObjectURL(selectedFile);

    this.loadFileFromUrl(fileUrl);
  };

  return Loader;

})();
