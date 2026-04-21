import { useEffect, useMemo, useState } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

type Kind = 'image' | 'markdown' | 'code' | 'text' | 'binary';

const CODE_LANGS: Record<string, string> = {
  js: 'javascript', mjs: 'javascript', cjs: 'javascript',
  jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
  json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'ini',
  html: 'xml', xml: 'xml', css: 'css', scss: 'scss',
  py: 'python', rb: 'ruby', go: 'go', rs: 'rust',
  java: 'java', kt: 'kotlin', swift: 'swift', c: 'c',
  h: 'c', cpp: 'cpp', cc: 'cpp', hpp: 'cpp', cs: 'csharp',
  php: 'php', sh: 'bash', bash: 'bash', zsh: 'bash',
  ps1: 'powershell', psm1: 'powershell', sql: 'sql',
  dockerfile: 'dockerfile', makefile: 'makefile',
  lua: 'lua', vim: 'vim', ini: 'ini', cfg: 'ini',
  r: 'r', dart: 'dart', ex: 'elixir', exs: 'elixir',
  clj: 'clojure', hs: 'haskell', scala: 'scala',
};

const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico']);
const MARKDOWN_EXT = new Set(['md', 'markdown', 'mdown']);
const TEXT_EXT = new Set(['txt', 'log', 'csv', 'tsv', 'env']);

function getExt(path: string): string {
  const base = path.split(/[\\/]/).pop() ?? '';
  if (base.toLowerCase() === 'dockerfile') return 'dockerfile';
  if (base.toLowerCase() === 'makefile') return 'makefile';
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : '';
}

function kindFor(path: string): Kind {
  const ext = getExt(path);
  if (IMAGE_EXT.has(ext)) return 'image';
  if (MARKDOWN_EXT.has(ext)) return 'markdown';
  if (ext in CODE_LANGS) return 'code';
  if (TEXT_EXT.has(ext) || ext === '') return 'text';
  return 'binary';
}

function mimeForImage(ext: string): string {
  if (ext === 'svg') return 'image/svg+xml';
  if (ext === 'jpg') return 'image/jpeg';
  if (ext === 'ico') return 'image/x-icon';
  return `image/${ext}`;
}

export function FilePreview({ path }: { path: string }): JSX.Element {
  const kind = useMemo(() => kindFor(path), [path]);
  if (kind === 'image') return <ImagePreview path={path} />;
  if (kind === 'markdown') return <MarkdownPreview path={path} />;
  if (kind === 'code') return <CodePreview path={path} />;
  return <TextPreview path={path} />;
}

function useTextContent(path: string): { content: string; loading: boolean } {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    window.afe
      .readFile(path)
      .then((c) => {
        if (cancelled) return;
        setContent(c);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setContent(`(error: ${err.message})`);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);
  return { content, loading };
}

function TextPreview({ path }: { path: string }): JSX.Element {
  const { content, loading } = useTextContent(path);
  return (
    <div className="preview preview-text">{loading ? 'Loading…' : content}</div>
  );
}

function MarkdownPreview({ path }: { path: string }): JSX.Element {
  const { content, loading } = useTextContent(path);
  const html = useMemo(() => {
    if (loading) return '';
    try {
      return marked.parse(content, { async: false, gfm: true, breaks: false }) as string;
    } catch (err) {
      return `<pre>(markdown parse error: ${(err as Error).message})</pre>`;
    }
  }, [content, loading]);
  if (loading) return <div className="preview preview-text">Loading…</div>;
  return <div className="preview preview-markdown" dangerouslySetInnerHTML={{ __html: html }} />;
}

function CodePreview({ path }: { path: string }): JSX.Element {
  const { content, loading } = useTextContent(path);
  const ext = useMemo(() => getExt(path), [path]);
  const highlighted = useMemo(() => {
    if (loading) return '';
    const lang = CODE_LANGS[ext];
    try {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(content, { language: lang, ignoreIllegals: true }).value;
      }
      return hljs.highlightAuto(content).value;
    } catch {
      return escapeHtml(content);
    }
  }, [content, loading, ext]);
  if (loading) return <div className="preview preview-text">Loading…</div>;
  return (
    <pre className="preview preview-code hljs">
      <code dangerouslySetInnerHTML={{ __html: highlighted }} />
    </pre>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function ImagePreview({ path }: { path: string }): JSX.Element {
  const [src, setSrc] = useState<string>('');
  const [err, setErr] = useState<string | null>(null);
  const [size, setSize] = useState<number>(0);
  const ext = useMemo(() => getExt(path), [path]);
  useEffect(() => {
    let cancelled = false;
    setSrc('');
    setErr(null);
    window.afe
      .readBinaryBase64(path)
      .then(({ base64, size: s }) => {
        if (cancelled) return;
        setSrc(`data:${mimeForImage(ext)};base64,${base64}`);
        setSize(s);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setErr(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [path, ext]);

  if (err) return <div className="preview preview-text">(error: {err})</div>;
  if (!src) return <div className="preview preview-text">Loading image…</div>;
  return (
    <div className="preview preview-image">
      <img src={src} alt={path} />
      <div className="preview-image-meta">{formatBytes(size)}</div>
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
