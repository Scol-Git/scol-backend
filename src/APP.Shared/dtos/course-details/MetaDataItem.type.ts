export type MetaDataItem = {
    subtitle: string;   // required — no optional
    description: string[];
  };
  
  export function isValidMetaDataItem(v: unknown): v is MetaDataItem {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
    const o = v as Record<string, unknown>;
    return (
      typeof o.subtitle === 'string' &&
      o.subtitle.trim().length > 0 &&
      Array.isArray(o.description) &&
      o.description.every((d) => typeof d === 'string')
    );
  }
  
  export function parseMetaDataItems(raw: unknown): MetaDataItem[] {
    if (!Array.isArray(raw)) return [];
    return raw.filter(isValidMetaDataItem);
  }