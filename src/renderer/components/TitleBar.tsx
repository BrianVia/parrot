import { Minus, Square, X } from 'lucide-react';

export function TitleBar() {
  return (
    <div className="drag-region flex items-center justify-between h-10 px-4 border-b border-border bg-background">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">Parrot</span>
      </div>

      <div className="no-drag flex items-center">
        <button
          onClick={() => window.parrot.minimize()}
          className="p-2 hover:bg-muted rounded-sm transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={() => window.parrot.maximize()}
          className="p-2 hover:bg-muted rounded-sm transition-colors"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={() => window.parrot.close()}
          className="p-2 hover:bg-destructive hover:text-destructive-foreground rounded-sm transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
