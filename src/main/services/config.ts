import Store from 'electron-store';

export interface AppConfig {
  general: {
    launchAtLogin: boolean;
    showInTray: boolean;
    closeToTray: boolean;
  };
  audio: {
    inputDevice: string;
    sampleRate: number;
  };
  transcription: {
    service: 'openai' | 'local';
    language: string; // ISO 639-1 code, e.g., 'en', 'es', 'auto'
    openai: {
      apiKey: string;
      model: 'whisper-1' | 'gpt-4o-transcribe';
    };
    local: {
      model: string;
      useGpu: boolean;
    };
  };
  hotkeys: {
    toggleRecording: string;
    cancelRecording: string;
    pushToTalk: string;
  };
  output: {
    autoPaste: boolean;
    autoCopy: boolean;
  };
  processing: {
    wordReplacements: Array<{ from: string; to: string }>;
    customVocabulary: string[];
  };
}

const defaults: AppConfig = {
  general: {
    launchAtLogin: false,
    showInTray: true,
    closeToTray: true,
  },
  audio: {
    inputDevice: 'default',
    sampleRate: 16000,
  },
  transcription: {
    service: 'openai',
    language: 'auto', // Auto-detect language
    openai: {
      apiKey: '',
      model: 'whisper-1',
    },
    local: {
      model: 'base',
      useGpu: true,
    },
  },
  hotkeys: {
    toggleRecording: 'CommandOrControl+Shift+Space',
    cancelRecording: 'Escape',
    pushToTalk: 'RightAlt',
  },
  output: {
    autoPaste: true,
    autoCopy: true,
  },
  processing: {
    wordReplacements: [],
    customVocabulary: [],
  },
};

export const configStore = new Store<AppConfig>({
  defaults,
  name: 'config',
  encryptionKey: 'parrot-config-encryption-key',
});

// Helper functions
export function getConfig(): AppConfig {
  return configStore.store;
}

export function setConfigValue(key: string, value: unknown): void {
  configStore.set(key, value);
}

export function getConfigValue<T>(key: string): T {
  return configStore.get(key) as T;
}
