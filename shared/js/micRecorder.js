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
    this.audioRecorder = false;
    this.recording = false;
    this.userGavePermission = false;
    this.$buttons = $(this.opt.recordButton);
    this.loadListeners();
  };

  MicRecorder.prototype.initAudioStream = function(stream){
    var audioContext = new AudioContext();
    var inputPoint = audioContext.createGain();

    // Create an AudioNode from the stream.
    var realAudioInput = audioContext.createMediaStreamSource(stream);
    var audioInput = realAudioInput;
    audioInput.connect(inputPoint);

    var analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;
    inputPoint.connect( analyserNode );

    var audioRecorder = new Recorder( inputPoint );

    this.audioRecorder = audioRecorder;
    this.analyserNode = analyserNode;
    this.pcmData = new Float32Array(analyserNode.fftSize);
    this.render();
  };

  MicRecorder.prototype.loadListeners = function(){
    this.$buttons.on('click', (e) => {
      this.toggleRecord();
    });
  };

  MicRecorder.prototype.render = function(){
    this.renderVolume();

    requestAnimationFrame( () => {
      this.render();
    } );
  };

  MicRecorder.prototype.renderVolume = function(){
    if (!this.recording) return;

    this.analyserNode.getFloatTimeDomainData(this.pcmData);
    var sumSquares = 0.0;
    for (var amplitude of pcmData) { sumSquares += amplitude*amplitude; }
    var volume = Math.sqrt(sumSquares / this.pcmData.length);
    console.log(volume);
  };

  MicRecorder.prototype.startRecording = function(){
    this.$buttons.text('Stop').addClass('active');

    this.audioRecorder.clear();
    this.audioRecorder.record();
  };

  MicRecorder.prototype.stopRecording = function(){
    this.$buttons.text('Record').removeClass('active');

    this.audioRecorder.stop();
    this.audioRecorder.getBuffers((buffers) => {
      this.opt.onAudioRecorded(buffers[0]);
    });
  };

  MicRecorder.prototype.toggleRecord = function(){
    this.recording = !this.recording;

    if (this.recording) {
      if (this.userGavePermission) {
        this.startRecording();

      } else {
        navigator.mediaDevices.getUserMedia(constraints)
          .then((stream) => {
            this.userGavePermission = true;
            this.initAudioStream(stream);
            this.startRecording();
          })
          .catch((err) => {
            alert('Could not retrieve microphone. Make sure you have an active microphone and you give permission for this app to use it!');
            console.log('Microphone error', err);
          });
      }

    } else {
      this.stopRecording();
    }

  };

  return MicRecorder;

})();
