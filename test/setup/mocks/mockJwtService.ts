/**
 * Mock JWT Service Factory
 * 
 * Creates a mock JWT service with token generation and verification.
 * 
 * @returns Mock JWT service object
 * 
 * @example
 * const mockJwt = createMockJwtService();
 * mockJwt.generateAccessToken.mockReturnValue('token');
 */
export const createMockJwtService = () => ({
  generateAccessToken: jest.fn(() => 'mock-access-token'),
  generateRefreshToken: jest.fn(() => 'mock-refresh-token'),
  verifyToken: jest.fn((token: string) => ({
    sub: 'user-id',
    orgId: 'org-id',
    email: 'test@example.com',
    roles: [],
    permissions: [],
  })),
  decodeToken: jest.fn(),
});

