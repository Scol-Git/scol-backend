/**
 * Mock App Config Factory
 * 
 * Creates a mock application configuration.
 * 
 * @returns Mock app config object
 * 
 * @example
 * const mockConfig = createMockAppConfig();
 */
export const createMockAppConfig = () => ({
  auth: {
    accountLockoutThreshold: 5,
    accountLockoutDurationMinutes: 30,
    refreshTokenExpirationDays: 7,
    passwordResetTokenExpirationHours: 1,
  },
  jwt: {
    accessTokenExpiresIn: '15m',
    refreshTokenExpiresIn: '7d',
  },
});

