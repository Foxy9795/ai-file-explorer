import { extractText } from './extractor.js';
import { Store } from './store.js';
import type { AIProvider } from './types.js';

export async function tagFile(
  store: Store,
  provider: AIProvider,
  filePath: string
): Promise<string[]> {
  const file = store.getFileByPath(filePath);
  const text = file
    ? store.chunksForFile(file.id).map((c) => c.text).join('\n\n')
    : await extractText(filePath, filePath.slice(filePath.lastIndexOf('.')));
  if (!text.trim()) return [];
  const trimmed = text.slice(0, 6000);
  const answer = await provider.chat(
    [
      {
        role: 'system',
        content:
          'Suggest between 3 and 6 short, lower-case, comma-separated tags that best categorize ' +
          'this file. Reply with ONLY the tags, no prose.',
      },
      { role: 'user', content: trimmed },
    ],
    { temperature: 0.0 }
  );
  const tags = Array.from(
    new Set(
      answer
        .replace(/[\n\r]/g, ',')
        .split(',')
        .map((t) => t.trim().replace(/^#/, '').toLowerCase())
        .filter((t) => t.length > 0 && t.length < 40)
    )
  ).slice(0, 8);
  if (file && tags.length > 0) store.updateTags(file.id, tags);
  return tags;
}
