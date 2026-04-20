import { useEffect, useState } from 'react';

export function FilePreview({ path }: { path: string }): JSX.Element {
  const [content, setContent] = useState<string>('Loading…');

  useEffect(() => {
    let cancelled = false;
    setContent('Loading…');
    window.afe
      .readFile(path)
      .then((c) => {
        if (!cancelled) setContent(c);
      })
      .catch((err: Error) => {
        if (!cancelled) setContent(`(error: ${err.message})`);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return <div className="preview">{content}</div>;
}
