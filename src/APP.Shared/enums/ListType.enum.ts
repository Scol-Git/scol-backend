/**
 * List type for filtering search results by eligibility
 */
export enum ListType {
  /** Show only courses the user is eligible for */
  ELIGIBLE_ONLY = 'ELIGIBLE_ONLY',

  /** Show only courses the user is NOT eligible for */
  INELIGIBLE_ONLY = 'INELIGIBLE_ONLY',
}
