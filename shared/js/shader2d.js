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
    attribute vec2 a_position;
    uniform vec2 u_resolution;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
    `;

    var fsSource = this.opt.fsSource || `
    uniform vec2 u_resolution;
    void main() {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
    `;

    var shaderProgram = this.loadProgram(gl, vsSource, fsSource);
    this.buffers = this.loadBuffers(gl);
    this.shaderProgram = shaderProgram;
    this.gl = gl;
  };

  Shader2D.prototype.draw = function(){
    var gl = this.gl;

    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    // gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    // gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var program = this.shaderProgram;
    // Tell WebGL to use our program when drawing
    gl.useProgram(program);

    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute.
    var buffers = this.buffers;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    var vertexPosition = this.aVertexPosition;
    var numComponents = 2;
    var type = gl.FLOAT;
    var normalize = false;
    var stride = 0;
    var offset = 0;
    var vertexPosition = gl.getAttribLocation(program, "a_position");
    gl.vertexAttribPointer( vertexPosition, numComponents, type, normalize, stride, offset);
    gl.enableVertexAttribArray(vertexPosition);

    // set resolution
    var canvas = this.canvas;
    var resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);

    var offset = 0;
    var vertexCount = 6;
    gl.drawArrays(gl.TRIANGLES, offset, vertexCount);
  };

  // https://blog.mayflower.de/4584-Playing-around-with-pixel-shaders-in-WebGL.html
  Shader2D.prototype.loadBuffers = function(gl){
    // Create a buffer for the square's positions.
    var positionBuffer = gl.createBuffer();

    // Select the positionBuffer as the one to apply buffer
    // operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Now create an array of positions for the square.
    var positions = [
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
       1.0,  1.0
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
