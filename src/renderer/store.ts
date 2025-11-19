import { create } from 'zustand';

export interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
}

export type RecordingState = 'idle' | 'recording' | 'processing' | 'complete' | 'error';

interface ParrotState {
  // Recording
  recordingState: RecordingState;
  setRecordingState: (state: RecordingState) => void;

  // Transcription
  lastResult: TranscriptionResult | null;
  setLastResult: (result: TranscriptionResult | null) => void;

  // Error
  error: string | null;
  setError: (error: string | null) => void;

  // Navigation
  currentView: 'recording' | 'history' | 'settings';
  setCurrentView: (view: 'recording' | 'history' | 'settings') => void;
}

export const useStore = create<ParrotState>((set) => ({
  recordingState: 'idle',
  setRecordingState: (recordingState) => set({ recordingState }),

  lastResult: null,
  setLastResult: (lastResult) => set({ lastResult }),

  error: null,
  setError: (error) => set({ error }),

  currentView: 'recording',
  setCurrentView: (currentView) => set({ currentView }),
}));
