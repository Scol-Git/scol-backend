import { applyDecorators } from '@nestjs/common';
import { SwaggerDocs } from './swagger-docs.registry';

/**
 * Apply registered Swagger decorators for the given controller/method key.
 * Usage: @AddSwaggerDoc('organizations', 'getOrganizations')
 */
export function AddSwaggerDoc(controllerKey: string, methodKey: string) {
  const registryKey = `${controllerKey}.${methodKey}`;
  const decorators = SwaggerDocs[registryKey] ?? [];
  return applyDecorators(
    ...(decorators as Array<ClassDecorator | MethodDecorator | PropertyDecorator>),
  );
}

