/**
 * Encode raw PCM audio data to WAV format
 */
export function encodeWav(
  audioBuffer: Buffer,
  sampleRate: number = 16000,
  channels: number = 1,
  bitsPerSample: number = 16
): Buffer {
  const dataLength = audioBuffer.length;
  const headerLength = 44;
  const totalLength = headerLength + dataLength;

  const buffer = Buffer.alloc(totalLength);
  let offset = 0;

  // RIFF header
  buffer.write('RIFF', offset);
  offset += 4;
  buffer.writeUInt32LE(totalLength - 8, offset);
  offset += 4;
  buffer.write('WAVE', offset);
  offset += 4;

  // fmt chunk
  buffer.write('fmt ', offset);
  offset += 4;
  buffer.writeUInt32LE(16, offset); // chunk size
  offset += 4;
  buffer.writeUInt16LE(1, offset); // PCM format
  offset += 2;
  buffer.writeUInt16LE(channels, offset);
  offset += 2;
  buffer.writeUInt32LE(sampleRate, offset);
  offset += 4;
  buffer.writeUInt32LE(sampleRate * channels * bitsPerSample / 8, offset); // byte rate
  offset += 4;
  buffer.writeUInt16LE(channels * bitsPerSample / 8, offset); // block align
  offset += 2;
  buffer.writeUInt16LE(bitsPerSample, offset);
  offset += 2;

  // data chunk
  buffer.write('data', offset);
  offset += 4;
  buffer.writeUInt32LE(dataLength, offset);
  offset += 4;

  // Audio data
  audioBuffer.copy(buffer, offset);

  return buffer;
}

/**
 * Convert Int16 PCM buffer to Float32 array (for whisper.cpp)
 */
export function int16ToFloat32(buffer: Buffer): Float32Array {
  const samples = new Int16Array(
    buffer.buffer,
    buffer.byteOffset,
    buffer.length / 2
  );

  const floats = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    floats[i] = samples[i] / 32768;
  }

  return floats;
}
