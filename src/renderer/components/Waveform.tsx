import { useEffect, useRef } from 'react';
import { clsx } from 'clsx';

interface WaveformProps {
  level: number;
  isRecording: boolean;
  className?: string;
}

export function Waveform({ level, isRecording, className }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<number[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Add current level to history
    if (isRecording) {
      historyRef.current.push(level);
      // Keep last 100 samples
      if (historyRef.current.length > 100) {
        historyRef.current.shift();
      }
    }

    // Animation function
    const draw = () => {
      const { width, height } = canvas;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      const history = historyRef.current;
      if (history.length === 0) {
        // Draw idle state - flat line
        ctx.strokeStyle = 'hsl(var(--muted-foreground) / 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        return;
      }

      // Draw waveform bars
      const barWidth = width / 100;
      const centerY = height / 2;

      // Fill color based on recording state
      ctx.fillStyle = isRecording
        ? 'hsl(0 84.2% 60.2%)' // destructive red
        : 'hsl(142.1 76.2% 36.3%)'; // green

      history.forEach((value, i) => {
        // Scale the value for better visualization
        const scaledValue = Math.pow(value, 0.5) * 2; // Square root for better dynamic range
        const barHeight = Math.max(2, scaledValue * height * 0.8);
        const x = i * barWidth;
        const y = centerY - barHeight / 2;

        ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
      });
    };

    draw();

    // Continue animation if recording
    if (isRecording) {
      animationRef.current = requestAnimationFrame(() => {
        // This will trigger re-render via level change
      });
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [level, isRecording]);

  // Reset history when not recording
  useEffect(() => {
    if (!isRecording) {
      // Fade out effect
      const fadeOut = () => {
        if (historyRef.current.length > 0) {
          historyRef.current = historyRef.current.map((v) => v * 0.9);
          if (historyRef.current[0] < 0.001) {
            historyRef.current = [];
          }
        }
      };

      const interval = setInterval(fadeOut, 50);
      return () => clearInterval(interval);
    }
  }, [isRecording]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={80}
      className={clsx(
        'rounded-lg bg-muted/50 border border-border',
        className
      )}
    />
  );
}
