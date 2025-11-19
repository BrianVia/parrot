import { useEffect } from 'react';
import { useStore } from './store';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { RecordingView } from './views/RecordingView';
import { HistoryView } from './views/HistoryView';
import { SettingsView } from './views/SettingsView';

export function App() {
  const { currentView, setRecordingState, setLastResult, setError } = useStore();

  useEffect(() => {
    // Set up event listeners from main process
    const unsubscribeState = window.parrot.onRecordingState((state) => {
      setRecordingState(state);
    });

    const unsubscribeResult = window.parrot.onTranscriptionResult((result) => {
      setLastResult(result);
    });

    const unsubscribeError = window.parrot.onError((error) => {
      setError(error);
      setRecordingState('error');
    });

    const unsubscribeHotkey = window.parrot.onHotkeyToggle(() => {
      // Toggle recording when hotkey is pressed
      const state = useStore.getState().recordingState;
      if (state === 'idle' || state === 'complete' || state === 'error') {
        window.parrot.startRecording();
      } else if (state === 'recording') {
        window.parrot.stopRecording();
      }
    });

    return () => {
      unsubscribeState();
      unsubscribeResult();
      unsubscribeError();
      unsubscribeHotkey();
    };
  }, [setRecordingState, setLastResult, setError]);

  return (
    <div className="flex flex-col h-screen bg-background">
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-auto">
          {currentView === 'recording' && <RecordingView />}
          {currentView === 'history' && <HistoryView />}
          {currentView === 'settings' && <SettingsView />}
        </main>
      </div>
    </div>
  );
}
