import OpenAI from 'openai';
import { encodeWav } from '../wav-encoder';
import type {
  TranscriptionService,
  TranscriptionOptions,
  TranscriptionResult,
} from './types';

export type OpenAIModel = 'whisper-1' | 'gpt-4o-transcribe';

export class OpenAITranscriptionService implements TranscriptionService {
  name = 'OpenAI Whisper';
  private client: OpenAI;
  private model: OpenAIModel;

  constructor(apiKey: string, model: OpenAIModel = 'whisper-1') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async transcribe(
    audio: Buffer,
    options: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    // Encode to WAV
    const wavBuffer = encodeWav(audio);

    // Create a File object for the API
    // Convert Buffer to ArrayBuffer - use Uint8Array for compatibility
    const uint8Array = new Uint8Array(wavBuffer);
    const file = new File([uint8Array], 'audio.wav', { type: 'audio/wav' });

    // Build request parameters
    const params: OpenAI.Audio.TranscriptionCreateParams = {
      file,
      model: this.model,
      response_format: 'verbose_json',
    };

    if (options.language) {
      params.language = options.language;
    }

    if (options.prompt) {
      params.prompt = options.prompt;
    }

    if (options.temperature !== undefined) {
      params.temperature = options.temperature;
    }

    if (options.wordTimestamps) {
      params.timestamp_granularities = ['word', 'segment'];
    }

    // Call API
    const response = await this.client.audio.transcriptions.create(params);

    // Parse verbose_json response
    const result = response as OpenAI.Audio.Transcription & {
      language?: string;
      duration?: number;
      segments?: Array<{ start: number; end: number; text: string }>;
      words?: Array<{ start: number; end: number; word: string }>;
    };

    return {
      text: result.text,
      language: result.language || 'unknown',
      duration: (result.duration || 0) * 1000, // Convert to ms
      segments: result.segments?.map((s) => ({
        start: s.start * 1000,
        end: s.end * 1000,
        text: s.text,
      })),
      words: result.words?.map((w) => ({
        start: w.start * 1000,
        end: w.end * 1000,
        word: w.word,
      })),
    };
  }

  setModel(model: OpenAIModel): void {
    this.model = model;
  }

  setApiKey(apiKey: string): void {
    this.client = new OpenAI({ apiKey });
  }
}
