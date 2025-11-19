import { useEffect, useState } from 'react';
import { Search, Trash2, Copy, Check, Clock } from 'lucide-react';
import { clsx } from 'clsx';

interface Transcription {
  id: number;
  text: string;
  language: string;
  duration: number;
  service: string;
  createdAt: string;
}

export function HistoryView() {
  const [history, setHistory] = useState<Transcription[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const items = await window.parrot.getHistory(100);
    setHistory(items);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const results = await window.parrot.searchHistory(query);
      setHistory(results);
    } else {
      loadHistory();
    }
  };

  const handleCopy = async (item: Transcription) => {
    await window.parrot.copyToClipboard(item.text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: number) => {
    await window.parrot.deleteHistoryItem(id);
    setHistory(history.filter(item => item.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const selectedItem = history.find(item => item.id === selectedId);

  return (
    <div className="flex h-full">
      {/* List */}
      <div className="w-1/2 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-semibold mb-4">History</h1>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search transcriptions..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
          </div>
        </div>

        {/* History list */}
        <div className="flex-1 overflow-auto">
          {history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No transcriptions yet</p>
              <p className="text-sm mt-1">Your history will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={clsx(
                    'p-4 cursor-pointer transition-colors',
                    selectedId === item.id
                      ? 'bg-muted'
                      : 'hover:bg-muted/50'
                  )}
                >
                  <p className="text-sm line-clamp-2 mb-2">{item.text}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatDate(item.createdAt)}</span>
                    <span>{formatDuration(item.duration)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail */}
      <div className="w-1/2 flex flex-col">
        {selectedItem ? (
          <>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {new Date(selectedItem.createdAt).toLocaleString()}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopy(selectedItem)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  title="Copy"
                >
                  {copiedId === selectedItem.id ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(selectedItem.id)}
                  className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-auto">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {selectedItem.text}
              </p>
            </div>

            <div className="p-4 border-t border-border text-xs text-muted-foreground">
              <div className="flex gap-4">
                <span>Language: {selectedItem.language}</span>
                <span>Duration: {formatDuration(selectedItem.duration)}</span>
                <span>Service: {selectedItem.service}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p className="text-sm">Select a transcription to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
