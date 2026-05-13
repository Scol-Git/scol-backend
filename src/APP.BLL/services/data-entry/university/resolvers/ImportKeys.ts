/**
 * Cache keys for location and university resolution (consistent across resolvers and builder).
 */
export function stateKey(sysCountryId: string, stateName: string): string {
  return `${sysCountryId}::${stateName.toLowerCase()}`;
}

export function cityKey(sysStateId: string, cityName: string): string {
  return `${sysStateId}::${cityName.toLowerCase()}`;
}

export function universityKey(uniName: string, sysCountryId: string, sysCityId: string): string {
  return `${uniName.toLowerCase()}::${sysCountryId}::${sysCityId}`;
}
