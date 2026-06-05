export function encodePcm16Wav(samples: Float32Array, sampleRate: number): Uint8Array {
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index] ?? 0));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }

  return new Uint8Array(buffer);
}

function mixAudioBufferToMono(audioBuffer: AudioBuffer): Float32Array {
  if (audioBuffer.numberOfChannels <= 1) {
    return audioBuffer.getChannelData(0);
  }

  const length = audioBuffer.length;
  const mixed = new Float32Array(length);
  for (let channelIndex = 0; channelIndex < audioBuffer.numberOfChannels; channelIndex += 1) {
    const channel = audioBuffer.getChannelData(channelIndex);
    for (let sampleIndex = 0; sampleIndex < length; sampleIndex += 1) {
      mixed[sampleIndex] = (mixed[sampleIndex] ?? 0) + (channel[sampleIndex] ?? 0);
    }
  }

  for (let sampleIndex = 0; sampleIndex < length; sampleIndex += 1) {
    mixed[sampleIndex] = (mixed[sampleIndex] ?? 0) / audioBuffer.numberOfChannels;
  }

  return mixed;
}

export function encodeAudioBufferToWav(audioBuffer: AudioBuffer): Uint8Array {
  return encodePcm16Wav(mixAudioBufferToMono(audioBuffer), audioBuffer.sampleRate);
}

export async function convertRecordedAudioBlobToWav(blob: Blob): Promise<Uint8Array> {
  const audioContext = new AudioContext();
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    return encodeAudioBufferToWav(audioBuffer);
  } finally {
    await audioContext.close();
  }
}
