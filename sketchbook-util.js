function ReBuffer(gl, count, size, options) {
  var buffers = [];
  var index = -1;
  options = options || {};
  options.type = options.type || gl.UNSIGNED_BYTE;

  for (var i=0; i<count; i++) {
    var rttFramebuffer = gl.createFramebuffer();
    rttFramebuffer.width = size;
    rttFramebuffer.height = size;
    gl.bindFramebuffer(gl.FRAMEBUFFER, rttFramebuffer);

    var rttTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, rttTexture);
    if (options.clamp) {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, options.filter || gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, options.filter || gl.NEAREST);

    // TODO: Pick the right pixel format
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, rttFramebuffer.width, rttFramebuffer.height, 0, gl.RGBA, options.type,
                  (options.data||[])[i] || null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rttTexture, 0);

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    buffers.push( {framebuffer:rttFramebuffer, texture:rttTexture} );
  }

  return {
    bindNext: function(gl) {
      index = (index+1) % buffers.length;
      gl.bindFramebuffer(gl.FRAMEBUFFER, buffers[index].framebuffer);

      gl.viewport(0, 0, size, size);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    },
    uniform: function(gl,shader,offset,name,textureIndex) {
      textureIndex = textureIndex || 0
      var buffer = buffers[(index + buffers.length - offset) % buffers.length];
      gl.activeTexture(gl['TEXTURE'+textureIndex]);
      gl.bindTexture(gl.TEXTURE_2D, buffer.texture);
      gl.uniform1i(gl.getUniformLocation(shader, name), textureIndex);
    },
    size: size,
    index: function() { return index }
  }
}

var SketchbookUtil = (function() {
  function startWebcam(video, next) {
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia
                            || navigator.mozGetUserMedia || navigator.msGetUserMedia;
    navigator.getUserMedia({audio:false,video:true}, function(stream) {
      video.src=URL.createObjectURL(stream);
      video.addEventListener('canplay', start);
    }, function(err) { console.log(err); });
  }

  function createProgram(gl, vertex, fragment, vertexLibraries, fragmentLibraries) {
    var fLibScripts = (fragmentLibraries||[]).map(function(id) {
      return document.getElementById(id).innerText
    }).join('\n');
    var fragmentShader = getShader(gl, fragment, fLibScripts);

    var vLibScripts = (vertexLibraries||[]).map(function(id) {
      return document.getElementById(id).innerText
    }).join('\n');
    var vertexShader = getShader(gl, vertex, vLibScripts);

    var shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      throw new Error("Unable to link " + vertex + " and " + fragment);
    }
    return shaderProgram;
  }


  function getShader(gl, id, libraries) {
    var shaderScript = document.getElementById(id);
    var source = (libraries||'') + shaderScript.innerText;

    if (shaderScript.type == "x-shader/x-fragment") {
      shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
      shader = gl.createShader(gl.VERTEX_SHADER);
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
      throw new Error("GL Compilation Error");
    }
    return shader;
  }

  function drawFlatBackground(gl, program, noClear) {
    if (gl.SUtriangleBuffer == null) {
      var vertices = new Float32Array([-1,-1,-1,4,4,-1]);

      gl.SUtriangleBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.SUtriangleBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    }

    var coordAttribute = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(coordAttribute);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.SUtriangleBuffer);
    gl.vertexAttribPointer(coordAttribute, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (! noClear)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  return {getShader:getShader, drawFlatBackground:drawFlatBackground,
          startWebcam: startWebcam, createProgram:createProgram}
})();
