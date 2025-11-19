import { useState, useEffect } from 'react';

export function SettingsView() {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('whisper-1');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const config = await window.parrot.getConfig();
    if (config?.transcription?.openai) {
      setApiKey(config.transcription.openai.apiKey || '');
      setModel(config.transcription.openai.model || 'whisper-1');
    }
  };

  const handleSaveApiKey = async () => {
    await window.parrot.setConfig('transcription.openai.apiKey', apiKey);
  };

  const handleModelChange = async (newModel: string) => {
    setModel(newModel);
    await window.parrot.setConfig('transcription.openai.model', newModel);
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>

      {/* OpenAI Configuration */}
      <section className="mb-8">
        <h2 className="text-lg font-medium mb-4">OpenAI Configuration</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">API Key</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={handleSaveApiKey}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Save
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Get your API key from{' '}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                platform.openai.com
              </a>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Model</label>
            <select
              value={model}
              onChange={(e) => handleModelChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="whisper-1">Whisper-1 (Standard)</option>
              <option value="gpt-4o-transcribe">GPT-4o Transcribe (Newer)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Hotkeys */}
      <section className="mb-8">
        <h2 className="text-lg font-medium mb-4">Keyboard Shortcuts</h2>

        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
            <span className="text-sm">Toggle Recording</span>
            <kbd className="px-2 py-1 rounded bg-background border border-border text-xs font-mono">
              Ctrl+Shift+Space
            </kbd>
          </div>
        </div>
      </section>

      {/* About */}
      <section>
        <h2 className="text-lg font-medium mb-4">About</h2>
        <p className="text-sm text-muted-foreground">
          Parrot v0.1.0
          <br />
          Voice to text transcription for Linux
        </p>
      </section>
    </div>
  );
}
