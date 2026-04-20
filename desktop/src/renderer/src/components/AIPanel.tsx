import { useState } from 'react';
import { SearchTab } from './SearchTab';
import { ChatTab } from './ChatTab';
import { SummaryTab } from './SummaryTab';
import { TagTab } from './TagTab';
import { SimilarTab } from './SimilarTab';

type Tab = 'search' | 'chat' | 'summary' | 'tag' | 'similar';

interface Props {
  selected: string | null;
  root: string | null;
}

export function AIPanel({ selected, root }: Props): JSX.Element {
  const [tab, setTab] = useState<Tab>('search');
  return (
    <div className="ai-panel">
      <div className="tabs">
        <div className={`tab${tab === 'search' ? ' active' : ''}`} onClick={() => setTab('search')}>
          Search
        </div>
        <div className={`tab${tab === 'chat' ? ' active' : ''}`} onClick={() => setTab('chat')}>
          Chat
        </div>
        <div className={`tab${tab === 'summary' ? ' active' : ''}`} onClick={() => setTab('summary')}>
          Summary
        </div>
        <div className={`tab${tab === 'tag' ? ' active' : ''}`} onClick={() => setTab('tag')}>
          Tag
        </div>
        <div className={`tab${tab === 'similar' ? ' active' : ''}`} onClick={() => setTab('similar')}>
          Similar
        </div>
      </div>
      {tab === 'search' && <SearchTab root={root} />}
      {tab === 'chat' && <ChatTab root={root} />}
      {tab === 'summary' && <SummaryTab selected={selected} />}
      {tab === 'tag' && <TagTab selected={selected} />}
      {tab === 'similar' && <SimilarTab selected={selected} />}
    </div>
  );
}
