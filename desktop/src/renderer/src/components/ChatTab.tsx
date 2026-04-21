import { useState } from 'react';
import type { SearchHit } from '@afe/core';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  sources?: SearchHit[];
}

export function ChatTab({ root }: { root: string | null }): JSX.Element {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (!input.trim()) return;
    const question = input;
    setMessages((m) => [...m, { role: 'user', content: question }]);
    setInput('');
    setLoading(true);
    setError(null);
    try {
      const res = await window.afe.chat(question);
      setMessages((m) => [...m, { role: 'assistant', content: res.answer, sources: res.sources }]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="body">
        {!root && <div className="empty">Select a folder to chat with.</div>}
        {root && messages.length === 0 && (
          <div className="empty">Ask a question about the indexed folder. Answers cite file sources.</div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            <div className="who">{m.role}</div>
            <div className="what">{m.content}</div>
            {m.sources && m.sources.length > 0 && (
              <div className="sources">
                {m.sources.map((s, k) => (
                  <div key={k}>
                    [{k + 1}] {s.file.path}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="chat-msg assistant">
            <div className="who">assistant</div>
            <div className="what">
              <span className="spinner" /> thinking…
            </div>
          </div>
        )}
        {error && <div className="empty" style={{ color: 'var(--err)' }}>{error}</div>}
      </div>
      <div className="controls">
        <textarea
          value={input}
          placeholder="Ask about this folder…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button className="primary" onClick={send} disabled={!root || loading || !input.trim()}>
          Send
        </button>
      </div>
    </>
  );
}
