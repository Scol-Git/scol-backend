/**
 * Mock Mapper Factory
 * 
 * Creates a mock AutoMapper with map and mapArray methods.
 * 
 * @returns Mock mapper object
 * 
 * @example
 * const mockMapper = createMockMapper();
 * mockMapper.map.mockReturnValue({ id: '1', name: 'Test' });
 */
export const createMockMapper = (): {
  map: jest.Mock;
  mapArray: jest.Mock;
} => {
  const mapFn = jest.fn((entity: any) => ({
    id: entity?.id,
    name: entity?.name,
    createdAt: entity?.createdAt,
    updatedAt: entity?.updatedAt,
    ...entity,
  }));

  return {
    map: mapFn,
    mapArray: jest.fn((entities: any[], sourceType?: any, destinationType?: any) => {
      if (!entities || !Array.isArray(entities)) {
        return [];
      }
      return entities.map((e: any) => mapFn(e));
    }),
  };
};

