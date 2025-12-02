import { createMockRepository } from './mockRepository';
import { createMockQueryBuilder } from './mockQueryBuilder';

/**
 * Mock DataSource Factory
 * 
 * Creates a mock TypeORM DataSource with getRepository and createQueryBuilder.
 * 
 * @param repositoryMap - Optional map of entity classes to repositories
 * @returns Mock DataSource object
 * 
 * @example
 * const mockRepo = createMockRepository();
 * const mockDataSource = createMockDataSource({ [Organization]: mockRepo });
 */
export const createMockDataSource = (repositoryMap: Map<any, any> | Record<any, any> = {}) => {
  const defaultRepository = createMockRepository();
  const isMap = repositoryMap instanceof Map;
  
  return {
    getRepository: jest.fn((entity: any) => {
      if (isMap) {
        return (repositoryMap as Map<any, any>).get(entity) || defaultRepository;
      }
      return (repositoryMap as Record<any, any>)[entity] || defaultRepository;
    }),
    createQueryBuilder: jest.fn((entity?: any, alias?: string) => {
      return createMockQueryBuilder();
    }),
    manager: {
      transaction: jest.fn(),
    },
  };
};

