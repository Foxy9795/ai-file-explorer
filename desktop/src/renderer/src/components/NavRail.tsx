import type { Section } from '../types';

interface Props {
  section: Section;
  onChange: (s: Section) => void;
  aiPanelOpen: boolean;
  onToggleAI: () => void;
}

const ITEMS: { id: Section; label: string; icon: string }[] = [
  { id: 'explorer', label: 'Explorer', icon: '📁' },
  { id: 'favorites', label: 'Favorites', icon: '⭐' },
  { id: 'recent', label: 'Recent', icon: '🕘' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
];

export function NavRail({ section, onChange, aiPanelOpen, onToggleAI }: Props): JSX.Element {
  return (
    <div className="nav-rail">
      <div className="nav-rail-top">
        {ITEMS.map((it) => (
          <button
            key={it.id}
            className={`rail-item${section === it.id ? ' active' : ''}`}
            onClick={() => onChange(it.id)}
            title={it.label}
          >
            <span className="rail-icon">{it.icon}</span>
            <span className="rail-label">{it.label}</span>
          </button>
        ))}
      </div>
      <div className="nav-rail-spacer" />
      <div className="nav-rail-bottom">
        <button
          className={`rail-item${aiPanelOpen ? ' active' : ''}`}
          onClick={onToggleAI}
          title="Toggle AI panel"
        >
          <span className="rail-icon">✨</span>
          <span className="rail-label">AI</span>
        </button>
      </div>
    </div>
  );
}
