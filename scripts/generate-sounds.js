const fs = require('fs');
const path = require('path');

const soundsDir = path.join(__dirname, '..', 'resources', 'sounds');

// Ensure directory exists
if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
}

// Generate a simple tone as WAV
function generateTone(frequency, duration, volume = 0.3) {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Int16Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Apply envelope for smooth start/end
    const envelope = Math.min(1, Math.min(t * 20, (duration - t) * 20));
    const sample = Math.sin(2 * Math.PI * frequency * t) * volume * envelope;
    samples[i] = Math.floor(sample * 32767);
  }

  return samples;
}

// Create WAV file from samples
function createWav(samples, sampleRate = 44100) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = samples.length * (bitsPerSample / 8);

  const buffer = Buffer.alloc(44 + dataSize);
  let offset = 0;

  // RIFF header
  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(36 + dataSize, offset); offset += 4;
  buffer.write('WAVE', offset); offset += 4;

  // fmt chunk
  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4;
  buffer.writeUInt16LE(1, offset); offset += 2; // PCM
  buffer.writeUInt16LE(numChannels, offset); offset += 2;
  buffer.writeUInt32LE(sampleRate, offset); offset += 4;
  buffer.writeUInt32LE(byteRate, offset); offset += 4;
  buffer.writeUInt16LE(blockAlign, offset); offset += 2;
  buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;

  // data chunk
  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;

  // Write samples
  for (let i = 0; i < samples.length; i++) {
    buffer.writeInt16LE(samples[i], offset);
    offset += 2;
  }

  return buffer;
}

// Generate start sound (ascending tone)
function generateStartSound() {
  const sampleRate = 44100;
  const duration = 0.15;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Int16Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const progress = i / numSamples;
    // Frequency sweep from 400Hz to 800Hz
    const frequency = 400 + progress * 400;
    const envelope = Math.min(1, Math.min(t * 30, (duration - t) * 30));
    const sample = Math.sin(2 * Math.PI * frequency * t) * 0.25 * envelope;
    samples[i] = Math.floor(sample * 32767);
  }

  return samples;
}

// Generate stop sound (descending tone)
function generateStopSound() {
  const sampleRate = 44100;
  const duration = 0.15;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Int16Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const progress = i / numSamples;
    // Frequency sweep from 800Hz to 400Hz
    const frequency = 800 - progress * 400;
    const envelope = Math.min(1, Math.min(t * 30, (duration - t) * 30));
    const sample = Math.sin(2 * Math.PI * frequency * t) * 0.25 * envelope;
    samples[i] = Math.floor(sample * 32767);
  }

  return samples;
}

// Generate complete sound (two-tone chime)
function generateCompleteSound() {
  const sampleRate = 44100;
  const duration = 0.3;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Int16Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const progress = i / numSamples;

    // Two notes: C5 (523Hz) then E5 (659Hz)
    const frequency = progress < 0.5 ? 523 : 659;
    const localProgress = progress < 0.5 ? progress * 2 : (progress - 0.5) * 2;
    const envelope = Math.min(1, Math.min(localProgress * 20, (0.5 - localProgress * 0.5) * 10));
    const sample = Math.sin(2 * Math.PI * frequency * t) * 0.25 * envelope;
    samples[i] = Math.floor(sample * 32767);
  }

  return samples;
}

// Generate all sounds
const startSamples = generateStartSound();
const stopSamples = generateStopSound();
const completeSamples = generateCompleteSound();

fs.writeFileSync(path.join(soundsDir, 'start.wav'), createWav(startSamples));
console.log('Created start.wav');

fs.writeFileSync(path.join(soundsDir, 'stop.wav'), createWav(stopSamples));
console.log('Created stop.wav');

fs.writeFileSync(path.join(soundsDir, 'complete.wav'), createWav(completeSamples));
console.log('Created complete.wav');

console.log('All sounds generated!');
