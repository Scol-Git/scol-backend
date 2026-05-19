/**
 * Cache keys for location and university resolution (consistent across resolvers and builder).
 */
export function stateKey(sysCountryId: string, stateName: string): string {
  return `${sysCountryId}::${stateName.toLowerCase()}`;
}

export function cityKey(sysStateId: string, cityName: string): string {
  return `${sysStateId}::${cityName.toLowerCase()}`;
}

/** University identity for bulk upsert and result maps (name only, case-insensitive). */
export function universityKey(uniName: string): string {
  return uniName.trim().toLowerCase();
}
