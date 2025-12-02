/**
 * Mock QueryBuilder Factory
 * 
 * Creates a mock TypeORM QueryBuilder with chaining methods.
 * 
 * @returns Mock QueryBuilder object
 * 
 * @example
 * const mockQB = createMockQueryBuilder();
 * mockQB.getMany.mockResolvedValue([{ id: '1' }]);
 */
export const createMockQueryBuilder = () => {
  const mockQB = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    applyDynamicFilters: jest.fn().mockReturnThis(),
    applyDynamicSorting: jest.fn().mockReturnThis(),
    applyPagination: jest.fn().mockReturnThis(),
    withOrganizationFilter: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
    getCount: jest.fn(),
    getRawMany: jest.fn(),
    getRawOne: jest.fn(),
    execute: jest.fn(),
  };
  
  return mockQB;
};

