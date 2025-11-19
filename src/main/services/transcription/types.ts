export interface TranscriptionOptions {
  language?: string;
  prompt?: string;
  temperature?: number;
  wordTimestamps?: boolean;
}

export interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
  segments?: Segment[];
  words?: Word[];
}

export interface Segment {
  start: number;
  end: number;
  text: string;
}

export interface Word {
  start: number;
  end: number;
  word: string;
}

export interface TranscriptionService {
  name: string;
  transcribe(audio: Buffer, options: TranscriptionOptions): Promise<TranscriptionResult>;
}
