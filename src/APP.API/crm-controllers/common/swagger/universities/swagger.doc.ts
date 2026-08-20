import {
  SwaggerDocSet,
  registerSwaggerDocs,
} from '@api/common/swagger/swagger-docs.registry';
import { crmEndpoint } from '../wrapped-response';
import { CrmUniversityDetailsResponseDto } from '@shared/dtos/crm/universities/CrmUniversityDetailsResponseDto';
import { UpdateCrmUniversityResponseDto } from '@shared/dtos/crm/universities/UpdateCrmUniversityResponseDto';
import { CrmUniversityStageFlowResponseDto } from '@shared/dtos/crm/universities/CrmUniversityStageFlowResponseDto';

const docs: Record<string, SwaggerDocSet> = {
  'crmUniversities.getUniversityDetails': crmEndpoint({
    summary: 'Get CRM university details',
    data: CrmUniversityDetailsResponseDto,
    successDescription: 'University details retrieved successfully',
    notFound: 'University not found',
  }),
  'crmUniversities.updateUniversity': crmEndpoint({
    summary: 'Update CRM university details',
    description: 'Partially updates university fields. ADMIN only.',
    data: UpdateCrmUniversityResponseDto,
    successDescription: 'University updated successfully',
    notFound: 'University not found',
  }),
  'crmUniversities.replaceApplicationStageFlow': crmEndpoint({
    summary: 'Replace university application stage flow order',
    description:
      'Idempotent full replace of the university-specific stage display order. Each stage must include displayOrder. ADMIN only. Does not affect the live application workflow.',
    data: CrmUniversityStageFlowResponseDto,
    successDescription: 'Application stage flow updated successfully',
    notFound: 'University not found',
  }),
};

Object.entries(docs).forEach(([key, value]) => registerSwaggerDocs(key, value));
