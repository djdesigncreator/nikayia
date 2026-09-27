/**
 * Cursor pagination simples baseado em (created_at, id) codificado em base64.
 * Evita OFFSET, que degrada com o crescimento da tabela.
 */
export interface Cursor {
  createdAt: string;
  id: string;
}

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64');
}

export function decodeCursor(raw?: string): Cursor | null {
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}
