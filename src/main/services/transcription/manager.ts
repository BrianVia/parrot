import { OpenAITranscriptionService, OpenAIModel } from './openai';
import type {
  TranscriptionService,
  TranscriptionOptions,
  TranscriptionResult,
} from './types';

export class TranscriptionManager {
  private services: Map<string, TranscriptionService> = new Map();
  private primaryService: string = 'openai';

  configureOpenAI(apiKey: string, model: OpenAIModel = 'whisper-1'): void {
    const existing = this.services.get('openai') as OpenAITranscriptionService | undefined;

    if (existing) {
      existing.setApiKey(apiKey);
      existing.setModel(model);
    } else {
      this.services.set('openai', new OpenAITranscriptionService(apiKey, model));
    }
  }

  setPrimaryService(name: string): void {
    if (!this.services.has(name)) {
      throw new Error(`Service ${name} not configured`);
    }
    this.primaryService = name;
  }

  getPrimaryService(): string {
    return this.primaryService;
  }

  async transcribe(
    audio: Buffer,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    const service = this.services.get(this.primaryService);

    if (!service) {
      throw new Error(`Transcription service '${this.primaryService}' not configured`);
    }

    return service.transcribe(audio, options);
  }

  getAvailableServices(): string[] {
    return Array.from(this.services.keys());
  }

  isConfigured(): boolean {
    return this.services.has(this.primaryService);
  }

  getServiceName(): string {
    const service = this.services.get(this.primaryService);
    return service?.name || 'Unknown';
  }
}

export type { TranscriptionOptions, TranscriptionResult } from './types';
