/**
 * Mock Password Hasher Factory
 * 
 * Creates a mock password hasher with hash and verify methods.
 * 
 * @returns Mock password hasher object
 * 
 * @example
 * const mockHasher = createMockPasswordHasher();
 * mockHasher.verifyPassword.mockResolvedValue(true);
 */
export const createMockPasswordHasher = () => ({
  hashPassword: jest.fn((password: string) => Promise.resolve(`hashed-${password}`)),
  verifyPassword: jest.fn((password: string, hash: string) => 
    Promise.resolve(hash === `hashed-${password}`)
  ),
});

