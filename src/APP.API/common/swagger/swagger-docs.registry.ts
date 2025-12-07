export type SwaggerDecorator = ClassDecorator | MethodDecorator | PropertyDecorator;
export type SwaggerDocSet = SwaggerDecorator[];

/**
 * Global registry to collect Swagger decorator sets per controller/method.
 * Keys should follow a consistent naming convention, e.g. `${controller}.${method}`.
 */
export const SwaggerDocs: Record<string, SwaggerDocSet> = {};

/**
 * Register a set of Swagger decorators under a key.
 */
export function registerSwaggerDocs(key: string, decorators: SwaggerDocSet) {
  SwaggerDocs[key] = decorators;
}

