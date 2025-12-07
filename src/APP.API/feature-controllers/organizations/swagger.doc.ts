import {
  ApiOperation,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { SwaggerDocSet, registerSwaggerDocs } from '@api/common/swagger/swagger-docs.registry';
import { OrganizationListResponseDto } from './dto/OrganizationListResponse.dto';
import { OrganizationDto } from './dto/Organization.dto';

const key = 'organizations.getOrganizations';

export const OrganizationsSwaggerDocs: Record<string, SwaggerDocSet> = {
  [key]: [
    ApiOperation({
      summary: 'List organizations',
      description: 'Returns a list of organizations (sample).',
    }),
    ApiOkResponse({
      description: 'Organizations returned successfully.',
      schema: {
        allOf: [
          { $ref: getSchemaPath(OrganizationListResponseDto) },
          {
            properties: {
              items: {
                type: 'array',
                items: { $ref: getSchemaPath(OrganizationDto) },
              },
            },
          },
        ],
      },
    }),
    ApiBadRequestResponse({ description: 'Invalid request.' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized.' }),
  ],
};

registerSwaggerDocs(key, OrganizationsSwaggerDocs[key]);

