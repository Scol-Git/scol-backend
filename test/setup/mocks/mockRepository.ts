/**
 * Mock Repository Factory
 * 
 * Creates a mock TypeORM repository with all common methods.
 * Use this in your tests instead of manually creating repository mocks.
 * 
 * @returns Mock repository object
 * 
 * @example
 * const mockRepo = createMockRepository();
 * mockRepo.findOne.mockResolvedValue({ id: '1', name: 'Test' });
 */
export const createMockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
});

