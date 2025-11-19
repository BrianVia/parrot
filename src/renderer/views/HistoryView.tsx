import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

interface Transcription {
  id: number;
  text: string;
  language: string;
  duration: number;
  createdAt: string;
}

export function HistoryView() {
  const [history, setHistory] = useState<Transcription[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const items = await window.parrot.getHistory(50);
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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">History</h1>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search transcriptions..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* History list */}
      {history.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No transcriptions yet</p>
          <p className="text-sm mt-1">Your transcription history will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <p className="text-sm line-clamp-2">{item.text}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(item.createdAt).toLocaleString()} • {item.language} •{' '}
                {(item.duration / 1000).toFixed(1)}s
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
