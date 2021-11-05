// based on: https://github.com/mdn/webgl-examples/blob/gh-pages/tutorial/sample2/webgl-demo.js
// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context

var Shader2D = (function() {

  function Shader2D(config) {
    var defaults = {
      canvas: false,
      vsSource: false,
      fsSource: false
    };
    this.opt = _.extend({}, defaults, config);

    this.init();
  }

  Shader2D.prototype.init = function(){
    if (!this.opt.canvas) return;

    this.canvas = this.opt.canvas;
    var gl = this.canvas.getContext("webgl");

    var vsSource = this.opt.vsSource || `
      attribute vec4 aVertexPosition;
      uniform mat4 uModelViewMatrix;
      uniform mat4 uProjectionMatrix;
      void main() {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
      }
    `;

    var fsSource = this.opt.fsSource || `
      void main() {
        gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
      }
    `;

    var shaderProgram = this.loadProgram(gl, vsSource, fsSource);
    this.aVertexPosition = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
    this.uProjectionMatrix = gl.getUniformLocation(shaderProgram, 'uProjectionMatrix');
    this.uModelViewMatrix = gl.getUniformLocation(shaderProgram, 'uModelViewMatrix');
    this.buffers = this.loadBuffers(gl);
    this.shaderProgram = shaderProgram;
    this.gl = gl;
  };

  Shader2D.prototype.draw = function(){
    var gl = this.gl;

    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

    // Clear the canvas before we start drawing on it.

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Create a perspective matrix, a special matrix that is
    // used to simulate the distortion of perspective in a camera.
    // Our field of view is 45 degrees, with a width/height
    // ratio that matches the display size of the canvas
    // and we only want to see objects between 0.1 units
    // and 100 units away from the camera.

    var fieldOfView = 45 * Math.PI / 180;   // in radians
    var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    var zNear = 0.1;
    var zFar = 100.0;
    var projectionMatrix = glMatrix.mat4.create();

    // note: glmatrix.js always has the first argument
    // as the destination to receive the result.
    glMatrix.mat4.perspective(projectionMatrix,
                     fieldOfView,
                     aspect,
                     zNear,
                     zFar);

    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    var modelViewMatrix =  glMatrix.mat4.create();

    // Now move the drawing position a bit to where we want to
    // start drawing the square.

     glMatrix.mat4.translate(modelViewMatrix,     // destination matrix
                   modelViewMatrix,     // matrix to translate
                   [-0.0, 0.0, -6.0]);  // amount to translate

    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute.
    var buffers = this.buffers;
    var vertexPosition = this.aVertexPosition;
    var numComponents = 2;
    var type = gl.FLOAT;
    var normalize = false;
    var stride = 0;
    var offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(
        vertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(vertexPosition);

    // Tell WebGL to use our program when drawing
    gl.useProgram(this.shaderProgram);

    // Set the shader uniforms

    gl.uniformMatrix4fv(
        this.uProjectionMatrix,
        false,
        projectionMatrix);

    gl.uniformMatrix4fv(
        this.uModelViewMatrix,
        false,
        modelViewMatrix);

    var offset = 0;
    var vertexCount = 4;
    gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
  };

  Shader2D.prototype.loadBuffers = function(gl){
    // Create a buffer for the square's positions.
    var positionBuffer = gl.createBuffer();

    // Select the positionBuffer as the one to apply buffer
    // operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Now create an array of positions for the square.
    var positions = [
      -1.0,  1.0,
       1.0,  1.0,
      -1.0, -1.0,
       1.0, -1.0,
    ];

    // Now pass the list of positions into WebGL to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer.
    gl.bufferData(gl.ARRAY_BUFFER,
                  new Float32Array(positions),
                  gl.STATIC_DRAW);

    return {
      position: positionBuffer,
    };
  };

  // https://github.com/mdn/webgl-examples/blob/gh-pages/tutorial/sample2/webgl-demo.js
  Shader2D.prototype.loadProgram = function(gl, vsSource, fsSource){
    var vertexShader = this.loadShader(gl, gl.VERTEX_SHADER, vsSource);
    var fragmentShader = this.loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    // Create the shader program
    var shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
      return null;
    }

    return shaderProgram;
  };

  Shader2D.prototype.loadShader = function(gl, type, source){
    var shader = gl.createShader(type);

    // Send the source to the shader object
    gl.shaderSource(shader, source);

    // Compile the shader program
    gl.compileShader(shader);

    // See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  };

  return Shader2D;

})();
