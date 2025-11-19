import { Mic, History, Settings } from 'lucide-react';
import { useStore } from '../store';
import { clsx } from 'clsx';

export function Sidebar() {
  const { currentView, setCurrentView } = useStore();

  const navItems = [
    { id: 'recording' as const, icon: Mic, label: 'Record' },
    { id: 'history' as const, icon: History, label: 'History' },
    { id: 'settings' as const, icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="w-16 border-r border-border bg-muted/30 flex flex-col items-center py-4 gap-2">
      {navItems.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => setCurrentView(id)}
          className={clsx(
            'flex flex-col items-center gap-1 p-2 rounded-lg transition-colors w-12',
            currentView === id
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
          )}
          title={label}
        >
          <Icon className="w-5 h-5" />
          <span className="text-[10px]">{label}</span>
        </button>
      ))}
    </nav>
  );
}
