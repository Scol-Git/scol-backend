/**
 * Mock Cache Service Factory
 * 
 * Creates a mock cache service (Redis, in-memory, etc.).
 * 
 * @returns Mock cache service object
 * 
 * @example
 * const mockCache = createMockCache();
 * mockCache.get.mockResolvedValue('cached-value');
 */
export const createMockCache = () => ({
  get: jest.fn(),
  set: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
  has: jest.fn().mockResolvedValue(false),
});

