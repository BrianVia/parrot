import { useState, useEffect } from 'react';
import { Moon, Sun, Volume2 } from 'lucide-react';

interface AudioDevice {
  id: number;
  name: string;
  isDefault: boolean;
}

export function SettingsView() {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('whisper-1');
  const [autoPaste, setAutoPaste] = useState(true);
  const [autoCopy, setAutoCopy] = useState(true);
  const [closeToTray, setCloseToTray] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<number>(-1);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadConfig();
    loadAudioDevices();
    // Check system dark mode preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDark);
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const loadConfig = async () => {
    const config = await window.parrot.getConfig();
    if (config) {
      setApiKey(config.transcription?.openai?.apiKey || '');
      setModel(config.transcription?.openai?.model || 'whisper-1');
      setAutoPaste(config.output?.autoPaste ?? true);
      setAutoCopy(config.output?.autoCopy ?? true);
      setCloseToTray(config.general?.closeToTray ?? true);
    }
  };

  const loadAudioDevices = async () => {
    const devices = await window.parrot.getAudioDevices();
    setAudioDevices(devices);
  };

  const handleSave = async (key: string, value: unknown) => {
    await window.parrot.setConfig(key, value);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveApiKey = () => handleSave('transcription.openai.apiKey', apiKey);
  const handleModelChange = (newModel: string) => {
    setModel(newModel);
    handleSave('transcription.openai.model', newModel);
  };
  const handleAutoPasteChange = (value: boolean) => {
    setAutoPaste(value);
    handleSave('output.autoPaste', value);
  };
  const handleAutoCopyChange = (value: boolean) => {
    setAutoCopy(value);
    handleSave('output.autoCopy', value);
  };
  const handleCloseToTrayChange = (value: boolean) => {
    setCloseToTray(value);
    handleSave('general.closeToTray', value);
  };
  const handleDeviceChange = (deviceId: number) => {
    setSelectedDevice(deviceId);
    window.parrot.setAudioDevice(deviceId);
  };

  const toggleDarkMode = () => {
    const newValue = !darkMode;
    setDarkMode(newValue);
    if (newValue) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        {saved && (
          <span className="text-sm text-green-600 dark:text-green-400">
            Saved!
          </span>
        )}
      </div>

      {/* Appearance */}
      <section className="mb-8">
        <h2 className="text-lg font-medium mb-4">Appearance</h2>
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
          <div className="flex items-center gap-3">
            {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            <span className="text-sm">Dark Mode</span>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              darkMode ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                darkMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </section>

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
                className="underline hover:text-foreground"
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

      {/* Audio */}
      <section className="mb-8">
        <h2 className="text-lg font-medium mb-4">Audio</h2>
        <div>
          <label className="block text-sm font-medium mb-2">Input Device</label>
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-muted-foreground" />
            <select
              value={selectedDevice}
              onChange={(e) => handleDeviceChange(Number(e.target.value))}
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value={-1}>Default Microphone</option>
              {audioDevices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Output */}
      <section className="mb-8">
        <h2 className="text-lg font-medium mb-4">Output</h2>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 rounded-lg bg-muted cursor-pointer">
            <span className="text-sm">Auto-copy to clipboard</span>
            <input
              type="checkbox"
              checked={autoCopy}
              onChange={(e) => handleAutoCopyChange(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
          </label>
          <label className="flex items-center justify-between p-3 rounded-lg bg-muted cursor-pointer">
            <span className="text-sm">Auto-paste after transcription</span>
            <input
              type="checkbox"
              checked={autoPaste}
              onChange={(e) => handleAutoPasteChange(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
          </label>
        </div>
      </section>

      {/* Behavior */}
      <section className="mb-8">
        <h2 className="text-lg font-medium mb-4">Behavior</h2>
        <label className="flex items-center justify-between p-3 rounded-lg bg-muted cursor-pointer">
          <span className="text-sm">Close to system tray</span>
          <input
            type="checkbox"
            checked={closeToTray}
            onChange={(e) => handleCloseToTrayChange(e.target.checked)}
            className="w-4 h-4 rounded border-border"
          />
        </label>
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
          <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
            <span className="text-sm">Push-to-Talk</span>
            <kbd className="px-2 py-1 rounded bg-background border border-border text-xs font-mono">
              Right Alt (hold)
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
          <br />
          <br />
          Built with Electron, React, and OpenAI Whisper
        </p>
      </section>
    </div>
  );
}
