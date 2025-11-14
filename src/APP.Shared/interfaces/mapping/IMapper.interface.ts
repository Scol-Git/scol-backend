/**
 * Interface for object-to-object mapping service.
 * 
 * Provides abstraction for AutoMapper functionality.
 * Similar to .NET's IMapper from AutoMapper library.
 * 
 * @interface IMapper
 */
export interface IMapper {
  /**
   * Map a single object from source type to destination type.
   * 
   * @param source - Source object to map from
   * @param sourceType - Source class/type constructor
   * @param destinationType - Destination class/type constructor
   * @returns Mapped destination object
   * 
   * @example
   * const dto = mapper.map(entity, Organization, OrganizationResponseDto);
   */
  map<TSource, TDestination>(
    source: TSource,
    sourceType: new (...args: any[]) => TSource,
    destinationType: new (...args: any[]) => TDestination,
  ): TDestination;

  /**
   * Map an array of objects from source type to destination type.
   * 
   * @param sourceArray - Array of source objects to map from
   * @param sourceType - Source class/type constructor
   * @param destinationType - Destination class/type constructor
   * @returns Array of mapped destination objects
   * 
   * @example
   * const dtos = mapper.mapArray(entities, Organization, OrganizationResponseDto);
   */
  mapArray<TSource, TDestination>(
    sourceArray: TSource[],
    sourceType: new (...args: any[]) => TSource,
    destinationType: new (...args: any[]) => TDestination,
  ): TDestination[];

  /**
   * Map a single object from source type to destination type asynchronously.
   * (Optional - for async mapping scenarios)
   * 
   * @param source - Source object to map from
   * @param sourceType - Source class/type constructor
   * @param destinationType - Destination class/type constructor
   * @returns Promise of mapped destination object
   */
  mapAsync?<TSource, TDestination>(
    source: TSource,
    sourceType: new (...args: any[]) => TSource,
    destinationType: new (...args: any[]) => TDestination,
  ): Promise<TDestination>;

  /**
   * Map an array of objects asynchronously.
   * (Optional - for async mapping scenarios)
   * 
   * @param sourceArray - Array of source objects to map from
   * @param sourceType - Source class/type constructor
   * @param destinationType - Destination class/type constructor
   * @returns Promise of array of mapped destination objects
   */
  mapArrayAsync?<TSource, TDestination>(
    sourceArray: TSource[],
    sourceType: new (...args: any[]) => TSource,
    destinationType: new (...args: any[]) => TDestination,
  ): Promise<TDestination[]>;
}


