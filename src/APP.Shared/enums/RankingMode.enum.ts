/**
 * Ranking mode based on user context
 */
export enum RankingMode {
  /**
   * Business-only ranking
   * Used when: Anonymous user OR logged in but academic form incomplete
   * Factors: Commission only
   */
  BUSINESS_ONLY = 'BUSINESS_ONLY',

  /**
   * Eligibility plus business ranking
   * Used when: Logged in AND academic form is completed/partially completed
   * Factors: Academic match + English match + Preferences + Commission
   */
  ELIGIBILITY_PLUS_BUSINESS = 'ELIGIBILITY_PLUS_BUSINESS',
}
