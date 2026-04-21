import { useEffect, useMemo, useState } from 'react';
import type { Density, ThemeMode, UiSettings } from '../../../preload/types';

interface Props {
  settings: UiSettings;
  onChange: (patch: Partial<UiSettings>) => void;
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
}

const ACCENT_PRESETS = [
  '#7aa7ff',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#14b8a6',
  '#64748b',
];

export function SettingsPage({ settings, onChange, onExport, onImport, onReset }: Props): JSX.Element {
  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>Settings</h2>
        <div className="settings-header-actions">
          <button className="btn" onClick={onExport} data-testid="settings-export">
            Export JSON
          </button>
          <button className="btn" onClick={onImport} data-testid="settings-import">
            Import JSON
          </button>
          <button className="btn btn-danger" onClick={onReset} data-testid="settings-reset">
            Reset to defaults
          </button>
        </div>
      </div>

      <section className="settings-section">
        <h3>Appearance</h3>
        <div className="settings-row">
          <label>Theme</label>
          <div className="seg-group">
            {(['dark', 'light', 'auto'] as ThemeMode[]).map((t) => (
              <button
                key={t}
                className={`seg ${settings.theme === t ? 'seg-on' : ''}`}
                onClick={() => onChange({ theme: t })}
                data-testid={`theme-${t}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-row">
          <label>Accent</label>
          <div className="accent-grid">
            {ACCENT_PRESETS.map((c) => (
              <button
                key={c}
                className={`accent-swatch ${settings.accent.toLowerCase() === c.toLowerCase() ? 'accent-on' : ''}`}
                style={{ background: c }}
                onClick={() => onChange({ accent: c })}
                title={c}
                data-testid={`accent-${c}`}
              />
            ))}
            <input
              type="color"
              value={settings.accent}
              onChange={(e) => onChange({ accent: e.target.value })}
              className="accent-picker"
              data-testid="accent-picker"
            />
          </div>
        </div>

        <div className="settings-row">
          <label>Density</label>
          <div className="seg-group">
            {(['compact', 'normal', 'comfy'] as Density[]).map((d) => (
              <button
                key={d}
                className={`seg ${settings.density === d ? 'seg-on' : ''}`}
                onClick={() => onChange({ density: d })}
                data-testid={`density-${d}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-row">
          <label>
            Opacity <span className="dim">({Math.round(settings.opacity * 100)}%)</span>
          </label>
          <input
            type="range"
            min={0.6}
            max={1}
            step={0.01}
            value={settings.opacity}
            onChange={(e) => onChange({ opacity: Number(e.target.value) })}
            className="slider"
            data-testid="opacity-slider"
          />
        </div>
      </section>

      <ProviderSection settings={settings} onChange={onChange} />

      <section className="settings-section">
        <h3>Data location</h3>
        <div className="settings-row">
          <label>Settings file</label>
          <code className="settings-path">~/.config/@afe/desktop/afe/settings.json</code>
        </div>
      </section>
    </div>
  );
}

function ProviderSection({
  settings,
  onChange,
}: {
  settings: UiSettings;
  onChange: (patch: Partial<UiSettings>) => void;
}): JSX.Element {
  const [tab, setTab] = useState<'ollama' | 'openai' | 'anthropic'>('ollama');
  const p = settings.provider;
  const setP = (patch: Partial<UiSettings['provider']>): void => onChange({ provider: { ...p, ...patch } });
  return (
    <section className="settings-section">
      <h3>AI provider</h3>
      <div className="seg-group">
        <button className={`seg ${tab === 'ollama' ? 'seg-on' : ''}`} onClick={() => setTab('ollama')}>
          Ollama
        </button>
        <button className={`seg ${tab === 'openai' ? 'seg-on' : ''}`} onClick={() => setTab('openai')}>
          OpenAI
        </button>
        <button className={`seg ${tab === 'anthropic' ? 'seg-on' : ''}`} onClick={() => setTab('anthropic')}>
          Anthropic
        </button>
      </div>
      {tab === 'ollama' && (
        <>
          <TextRow
            label="Base URL"
            value={p.ollamaBaseUrl}
            onChange={(v) => setP({ ollamaBaseUrl: v })}
            placeholder="http://127.0.0.1:11434"
            testId="ollama-url"
          />
          <TextRow
            label="Chat model"
            value={p.ollamaChatModel}
            onChange={(v) => setP({ ollamaChatModel: v })}
            placeholder="llama3.2:1b"
            testId="ollama-chat"
          />
          <TextRow
            label="Embed model"
            value={p.ollamaEmbedModel}
            onChange={(v) => setP({ ollamaEmbedModel: v })}
            placeholder="nomic-embed-text"
            testId="ollama-embed"
          />
        </>
      )}
      {tab === 'openai' && (
        <>
          <SecretRow
            label="API key"
            value={p.openaiApiKey}
            onChange={(v) => setP({ openaiApiKey: v })}
            placeholder="sk-..."
            testId="openai-key"
          />
          <TextRow
            label="Chat model"
            value={p.openaiChatModel}
            onChange={(v) => setP({ openaiChatModel: v })}
            placeholder="gpt-4o-mini"
            testId="openai-chat"
          />
          <TextRow
            label="Embed model"
            value={p.openaiEmbedModel}
            onChange={(v) => setP({ openaiEmbedModel: v })}
            placeholder="text-embedding-3-small"
            testId="openai-embed"
          />
        </>
      )}
      {tab === 'anthropic' && (
        <>
          <SecretRow
            label="API key"
            value={p.anthropicApiKey}
            onChange={(v) => setP({ anthropicApiKey: v })}
            placeholder="sk-ant-..."
            testId="anthropic-key"
          />
          <TextRow
            label="Chat model"
            value={p.anthropicChatModel}
            onChange={(v) => setP({ anthropicChatModel: v })}
            placeholder="claude-3-5-haiku-latest"
            testId="anthropic-chat"
          />
        </>
      )}
      <p className="dim small">
        Provider wiring lands in Phase G. These values are persisted now so OpenAI/Anthropic streaming can pick
        them up.
      </p>
    </section>
  );
}

function TextRow({
  label,
  value,
  onChange,
  placeholder,
  testId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  testId?: string;
}): JSX.Element {
  return (
    <div className="settings-row">
      <label>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input"
        data-testid={testId}
      />
    </div>
  );
}

function SecretRow({
  label,
  value,
  onChange,
  placeholder,
  testId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  testId?: string;
}): JSX.Element {
  const [show, setShow] = useState(false);
  const masked = useMemo(() => (value ? value.replace(/./g, '•') : ''), [value]);
  return (
    <div className="settings-row">
      <label>{label}</label>
      <div className="secret-row">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="input"
          data-testid={testId}
          autoComplete="off"
          spellCheck={false}
        />
        <button className="btn btn-ghost" onClick={() => setShow((s) => !s)} title={show ? 'Hide' : 'Show'}>
          {show ? '🙈' : '👁'}
        </button>
      </div>
      {!show && value && <div className="dim small">Stored ({masked.length} chars)</div>}
    </div>
  );
}
