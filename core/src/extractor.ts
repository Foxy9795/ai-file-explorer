import { promises as fs } from 'node:fs';

const MAX_TEXT_BYTES = 512 * 1024;

export async function extractText(filePath: string, ext: string): Promise<string> {
  const lower = ext.toLowerCase();
  if (lower === '.pdf') {
    const pdfParse = (await import('pdf-parse')).default;
    const buf = await fs.readFile(filePath);
    try {
      const data = await pdfParse(buf);
      return truncate(data.text ?? '');
    } catch {
      return '';
    }
  }
  if (lower === '.docx') {
    const mammoth = await import('mammoth');
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return truncate(result.value ?? '');
    } catch {
      return '';
    }
  }
  // Fall through: read as UTF-8 text.
  try {
    const stat = await fs.stat(filePath);
    if (stat.size > MAX_TEXT_BYTES) {
      const handle = await fs.open(filePath, 'r');
      const buf = Buffer.alloc(MAX_TEXT_BYTES);
      await handle.read(buf, 0, MAX_TEXT_BYTES, 0);
      await handle.close();
      return truncate(buf.toString('utf-8'));
    }
    return truncate(await fs.readFile(filePath, 'utf-8'));
  } catch {
    return '';
  }
}

function truncate(s: string): string {
  if (s.length > MAX_TEXT_BYTES) return s.slice(0, MAX_TEXT_BYTES);
  return s;
}

export function chunkText(text: string, maxLen = 800, overlap = 100): string[] {
  const clean = text.replace(/\r\n/g, '\n').trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    const end = Math.min(clean.length, i + maxLen);
    let slice = clean.slice(i, end);
    // Prefer breaking on a paragraph boundary near the end.
    if (end < clean.length) {
      const lastNl = slice.lastIndexOf('\n\n');
      if (lastNl > maxLen * 0.4) slice = slice.slice(0, lastNl);
    }
    chunks.push(slice.trim());
    if (end >= clean.length) break;
    i += Math.max(1, slice.length - overlap);
  }
  return chunks.filter((c) => c.length > 0);
}
