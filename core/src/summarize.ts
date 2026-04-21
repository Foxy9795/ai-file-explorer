import { extractText } from './extractor.js';
import { Store } from './store.js';
import type { AIProvider } from './types.js';

export async function summarizeFile(
  store: Store,
  provider: AIProvider,
  filePath: string
): Promise<string> {
  const file = store.getFileByPath(filePath);
  const text = file
    ? store.chunksForFile(file.id).map((c) => c.text).join('\n\n')
    : await extractText(filePath, filePath.slice(filePath.lastIndexOf('.')));
  if (!text.trim()) return '(no extractable text)';
  const trimmed = text.slice(0, 8000);
  const answer = await provider.chat(
    [
      {
        role: 'system',
        content:
          'Summarize the provided file content in 3-5 concise bullet points. ' +
          'Focus on topic, key entities, and any actions or conclusions.',
      },
      { role: 'user', content: trimmed },
    ],
    { temperature: 0.2 }
  );
  if (file) store.updateSummary(file.id, answer);
  return answer;
}
