class AudioUtil {
  // https://github.com/Jam3/audiobuffer-to-wav
  static audioBufferToWav(buffer, opt = {}) {
    const { numberOfChannels, sampleRate } = buffer;
    const format = opt.float32 ? 3 : 1;
    const bitDepth = format === 3 ? 32 : 16;

    let result;
    if (numberOfChannels === 2) {
      result = AudioUtil.interleave(buffer.getChannelData(0), buffer.getChannelData(1));
    } else {
      result = buffer.getChannelData(0);
    }

    return AudioUtil.encodeWAV(result, format, sampleRate, numberOfChannels, bitDepth);
  }

  static encodeWAV(samples, format, sampleRate, numChannels, bitDepth) {
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
    const view = new DataView(buffer);

    /* RIFF identifier */
    AudioUtil.writeString(view, 0, 'RIFF');
    /* RIFF chunk length */
    view.setUint32(4, 36 + samples.length * bytesPerSample, true);
    /* RIFF type */
    AudioUtil.writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    AudioUtil.writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, format, true);
    /* channel count */
    view.setUint16(22, numChannels, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * blockAlign, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, blockAlign, true);
    /* bits per sample */
    view.setUint16(34, bitDepth, true);
    /* data chunk identifier */
    AudioUtil.writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, samples.length * bytesPerSample, true);
    if (format === 1) { // Raw PCM
      AudioUtil.floatTo16BitPCM(view, 44, samples);
    } else {
      AudioUtil.writeFloat32(view, 44, samples);
    }
    return buffer;
  }

  static interleave(inputL, inputR) {
    const length = inputL.length + inputR.length;
    const result = new Float32Array(length);

    let index = 0;
    let inputIndex = 0;
    while (index < length) {
      result[index] = inputL[inputIndex];
      index += 1;
      result[index] = inputR[inputIndex];
      index += 1;
      inputIndex += 1;
    }

    return result;
  }

  static writeFloat32(output, offset, input) {
    let iOffset = offset;
    for (let i = 0; i < input.length; i += 1, iOffset += 4) {
      output.setFloat32(iOffset, input[i], true);
    }
  }

  static floatTo16BitPCM(output, offset, input) {
    let iOffset = offset;
    for (let i = 0; i < input.length; i += 1, iOffset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(iOffset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
  }

  static writeString(view, offset, string) {
    for (let i = 0; i < string.length; i += 1) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  static audioBufferToWavfile(buffer, filename) {
    const wav = AudioUtil.audioBufferToWav(buffer);
    const blob = new window.Blob([new DataView(wav)], {
      type: 'audio/wav',
    });

    AudioUtil.downloadBlob(blob, filename);
  }

  static downloadBlob(blob, filename) {
    // for internet explorer
    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveOrOpenBlob(blob, filename);
      return;
    }

    const url = window.URL.createObjectURL(blob);
    const anchorId = 'invisibleBufferAchnor';
    let anchor = document.getElementById(anchorId);
    if (!anchor) {
      anchor = document.createElement('a');
      document.body.appendChild(anchor);
      anchor.id = anchorId;
      anchor.style = 'position: absolute; height: 1px; width: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap;';
    }
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }
}
