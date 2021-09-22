var Loader = (function() {

  function Loader(config) {
    var defaults = {
      onAudioLoaded: function(audioBuffer){}
    };
    this.opt = _.extend({}, defaults, config);

    this.init();
  }

  Loader.prototype.init = function(){
    this.audioLoaded = false;
  };

  Loader.prototype.loadFileFromLocal = function(file){
    this.audioLoaded = false;
    this.audioContext = new AudioContext();

    var reader = new FileReader();
    reader.onload = (e) => {

      // Decode audio
      console.log('Decoding audio...')
      this.audioContext.decodeAudioData(e.target.result).then((buffer) => {
        this.audioSource = this.audioContext.createBufferSource();
        this.audioSource.buffer = buffer;
        this.audioLoaded = true;
        this.opt.onAudioLoaded(this.audioSource.buffer);

      });
    };
    console.log('Reading local file...');
    reader.readAsArrayBuffer(file);
  };

  Loader.prototype.onSelectLocalFiles = function(files){
    console.log('Local file select: ', files);
    if (files.length < 1) return;

    var selectedFile = files[0];

    this.loadFileFromLocal(selectedFile);
  };

  return Loader;

})();
