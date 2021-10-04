var MicRecorder = (function() {

  function MicRecorder(config) {
    var defaults = {
      onAudioRecorded: function(audioBuffer){},
      recordButton: '.record-toggle'
    };
    this.opt = _.extend({}, defaults, config);

    this.init();
  }

  MicRecorder.prototype.init = function(){
    this.recording = false;
    this.$buttons = $(this.opt.recordButton);
    this.loadListeners();
  };

  MicRecorder.prototype.loadListeners = function(){
    this.$buttons.on('click', (e) => {
      this.toggleRecord();
    });
  };

  MicRecorder.prototype.toggleRecord = function(){
    this.recording = !this.recording;

    if (this.recording) {
      this.$buttons.text('Stop').addClass('active');
    } else {
      this.$buttons.text('Record').removeClass('active');
    }


  };

  return MicRecorder;

})();
