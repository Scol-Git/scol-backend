import type { MetaDataItem } from '@shared/types/MetaDataItem.type';

function isMetaDataItem(value: unknown): value is MetaDataItem {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row.subtitle === 'string' &&
    Array.isArray(row.description) &&
    row.description.every((item) => typeof item === 'string')
  );
}

export function parseMetaDataItems(raw: string): MetaDataItem[] | null {
  const text = raw.trim();
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }
    if (!parsed.every(isMetaDataItem)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

