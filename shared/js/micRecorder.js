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

    this.audioContext = audioContext;
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

    var freqByteData = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(freqByteData);
    var values = 0;
    var length = freqByteData.length;
    if (length <= 0) return;

    for (var i = 0; i < length; i++) {
      values += (freqByteData[i]);
    }
    var average = values / length;
    var volume = average / 100;
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
      // console.log(buffers);
      var audioBuffer = new AudioBuffer({
        length: buffers[0].length,
        numberOfChannels: buffers.length,
        sampleRate: this.audioContext.sampleRate
      });
      for (var channel = 0; channel < buffers.length; channel++) {
        audioBuffer.copyToChannel(buffers[channel], channel);
      }
      this.opt.onAudioRecorded(audioBuffer);
    });
  };

  MicRecorder.prototype.toggleRecord = function(){
    this.recording = !this.recording;

    var constraints = {
        "audio": {
            "mandatory": {
                "googEchoCancellation": "false",
                "googAutoGainControl": "false",
                "googNoiseSuppression": "false",
                "googHighpassFilter": "false"
            },
            "optional": []
        },
    };

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
