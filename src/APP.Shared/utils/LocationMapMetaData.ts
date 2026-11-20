/**
 * Reads the href from locationMapMetaData.
 * Stored text may be a plain URL, a JSON string, or {"href":"..."}.
 */
export function extractLocationMapHref(raw: string | null | undefined): string | null {
  const text = raw?.trim();
  if (!text) return null;

  let candidate = text;
  if (text.startsWith('{') || text.startsWith('"')) {
    try {
      const parsed = JSON.parse(text) as unknown;
      const href =
        typeof parsed === 'string' ? parsed : (parsed as { href?: unknown })?.href;
      if (typeof href !== 'string' || !href.trim()) return null;
      candidate = href.trim();
    } catch {
      return null;
    }
  }

  try {
    return new URL(candidate).href;
  } catch {
    return null;
  }
}
