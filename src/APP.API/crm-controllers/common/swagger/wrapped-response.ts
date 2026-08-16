import { Type } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import type { SwaggerDocSet } from '@api/common/swagger/swagger-docs.registry';
import { ErrorResponseDto } from '@shared/dtos/common/ErrorResponseDto';
import { SuccessResponseDto } from '@shared/dtos/common/SuccessResponseDto';

function wrappedSuccessSchema(dataType: Type<unknown>) {
  return {
    allOf: [
      { $ref: getSchemaPath(SuccessResponseDto) },
      {
        properties: {
          data: { $ref: getSchemaPath(dataType) },
        },
      },
    ],
  };
}

export function crmSuccessResponse(
  dataType: Type<unknown>,
  description: string,
  status: 200 | 201 = 200,
) {
  const schema = wrappedSuccessSchema(dataType);
  if (status === 201) {
    return ApiCreatedResponse({ description, schema });
  }
  return ApiOkResponse({ description, schema });
}

export function crmErrorResponses(options?: { notFound?: string }) {
  const errors = [
    ApiBadRequestResponse({
      description: 'Validation error or invalid UUID',
      schema: { $ref: getSchemaPath(ErrorResponseDto) },
    }),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid JWT',
      schema: { $ref: getSchemaPath(ErrorResponseDto) },
    }),
    ApiForbiddenResponse({
      description: 'Requires ADMIN or COUNSELLOR role',
      schema: { $ref: getSchemaPath(ErrorResponseDto) },
    }),
  ];

  if (options?.notFound) {
    errors.push(
      ApiNotFoundResponse({
        description: options.notFound,
        schema: { $ref: getSchemaPath(ErrorResponseDto) },
      }),
    );
  }

  return errors;
}

export function crmEndpoint(options: {
  summary: string;
  description?: string;
  data: Type<unknown>;
  successDescription: string;
  created?: boolean;
  notFound?: string;
}): SwaggerDocSet {
  return [
    ApiOperation({
      summary: options.summary,
      description: options.description,
    }),
    crmSuccessResponse(
      options.data,
      options.successDescription,
      options.created ? 201 : 200,
    ),
    ...crmErrorResponses({ notFound: options.notFound }),
  ];
}
