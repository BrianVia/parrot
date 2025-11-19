import { AudioIO, SampleFormat16Bit } from 'naudiodon';
import { EventEmitter } from 'events';

export interface AudioConfig {
  sampleRate: number;
  channels: number;
  deviceId?: number;
}

export interface AudioDevice {
  id: number;
  name: string;
  maxInputChannels: number;
  defaultSampleRate: number;
  isDefault: boolean;
}

export class AudioService extends EventEmitter {
  private audioIO: any = null;
  private chunks: Buffer[] = [];
  private isRecording = false;
  private config: AudioConfig;

  constructor(config: Partial<AudioConfig> = {}) {
    super();
    this.config = {
      sampleRate: config.sampleRate ?? 16000,
      channels: config.channels ?? 1,
      deviceId: config.deviceId,
    };
  }

  getInputDevices(): AudioDevice[] {
    try {
      // naudiodon uses getDevices as a standalone function
      const { getDevices } = require('naudiodon');
      const devices = getDevices();
      return devices
        .filter((d: any) => d.maxInputChannels > 0)
        .map((d: any) => ({
          id: d.id,
          name: d.name,
          maxInputChannels: d.maxInputChannels,
          defaultSampleRate: d.defaultSampleRate,
          isDefault: d.id === -1,
        }));
    } catch (error) {
      console.error('Failed to get audio devices:', error);
      return [];
    }
  }

  setDevice(deviceId: number): void {
    this.config.deviceId = deviceId;
  }

  startRecording(): void {
    if (this.isRecording) {
      console.warn('Already recording');
      return;
    }

    this.chunks = [];
    this.isRecording = true;

    try {
      this.audioIO = AudioIO({
        inOptions: {
          channelCount: this.config.channels,
          sampleFormat: SampleFormat16Bit,
          sampleRate: this.config.sampleRate,
          deviceId: this.config.deviceId ?? -1,
          closeOnError: false,
        },
      });

      this.audioIO!.on('data', (chunk: Buffer) => {
        this.chunks.push(chunk);
        const level = this.calculateLevel(chunk);
        this.emit('level', level);
      });

      this.audioIO!.on('error', (err: Error) => {
        console.error('Audio error:', err);
        this.emit('error', err);
        this.cleanup();
      });

      this.audioIO!.start();
      this.emit('started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.isRecording = false;
      this.emit('error', error);
    }
  }

  stopRecording(): Buffer {
    if (!this.isRecording) {
      throw new Error('Not recording');
    }

    this.cleanup();

    const audioBuffer = Buffer.concat(this.chunks);
    const duration = (audioBuffer.length / 2) / this.config.sampleRate * 1000;

    this.emit('stopped', { buffer: audioBuffer, duration });

    return audioBuffer;
  }

  cancelRecording(): void {
    if (!this.isRecording) return;
    this.cleanup();
    this.emit('cancelled');
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  private cleanup(): void {
    if (this.audioIO) {
      try {
        this.audioIO.quit();
      } catch (e) {
        // Ignore cleanup errors
      }
      this.audioIO = null;
    }
    this.isRecording = false;
    this.chunks = [];
  }

  private calculateLevel(chunk: Buffer): number {
    // Calculate RMS for visualization (0-1 range)
    const samples = new Int16Array(
      chunk.buffer,
      chunk.byteOffset,
      chunk.length / 2
    );

    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }

    const rms = Math.sqrt(sum / samples.length);
    return Math.min(1, rms / 32768);
  }
}
