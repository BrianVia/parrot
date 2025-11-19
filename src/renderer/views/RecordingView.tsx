import { useStore } from '../store';
import { Mic, Square, Loader2, Copy, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Waveform } from '../components/Waveform';

export function RecordingView() {
  const { recordingState, lastResult, error } = useStore();
  const [copied, setCopied] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const isRecording = recordingState === 'recording';
  const isProcessing = recordingState === 'processing';

  useEffect(() => {
    const unsubscribe = window.parrot.onAudioLevel((level) => {
      setAudioLevel(level);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleToggleRecording = async () => {
    if (isRecording) {
      await window.parrot.stopRecording();
    } else {
      await window.parrot.startRecording();
    }
  };

  const handleCopy = async () => {
    if (lastResult?.text) {
      await window.parrot.copyToClipboard(lastResult.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      {/* Waveform visualization */}
      <div className="mb-6">
        <Waveform level={audioLevel} isRecording={isRecording} />
      </div>

      {/* Status indicator */}
      <div className="mb-8 text-center">
        <p className="text-muted-foreground text-sm">
          {recordingState === 'idle' && 'Press Ctrl+Shift+Space or click to record'}
          {recordingState === 'recording' && 'Recording... Click to stop'}
          {recordingState === 'processing' && 'Transcribing...'}
          {recordingState === 'complete' && 'Transcription complete'}
          {recordingState === 'error' && (error || 'An error occurred')}
        </p>
      </div>

      {/* Record button */}
      <button
        onClick={handleToggleRecording}
        disabled={isProcessing}
        className={clsx(
          'w-20 h-20 rounded-full flex items-center justify-center transition-all',
          'shadow-lg hover:shadow-xl active:scale-95',
          isRecording
            ? 'bg-destructive text-destructive-foreground animate-pulse'
            : isProcessing
            ? 'bg-muted text-muted-foreground cursor-not-allowed'
            : 'bg-primary text-primary-foreground hover:bg-primary/90'
        )}
      >
        {isProcessing ? (
          <Loader2 className="w-8 h-8 animate-spin" />
        ) : isRecording ? (
          <Square className="w-8 h-8" />
        ) : (
          <Mic className="w-8 h-8" />
        )}
      </button>

      {/* Result display */}
      {lastResult && (
        <div className="mt-8 w-full max-w-lg">
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm whitespace-pre-wrap">{lastResult.text}</p>
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={handleCopy}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors',
                'border border-border hover:bg-muted'
              )}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            {lastResult.language} • {(lastResult.duration / 1000).toFixed(1)}s
          </p>
        </div>
      )}
    </div>
  );
}
