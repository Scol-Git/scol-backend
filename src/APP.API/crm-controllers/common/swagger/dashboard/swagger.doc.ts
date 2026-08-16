import {
  SwaggerDocSet,
  registerSwaggerDocs,
} from '@api/common/swagger/swagger-docs.registry';
import { crmEndpoint } from '../wrapped-response';
import { CrmDashboardResponseDto } from '@shared/dtos/crm/dashboard/CrmDashboardResponseDto';

const docs: Record<string, SwaggerDocSet> = {
  'crmDashboard.getDashboard': crmEndpoint({
    summary: 'Get CRM dashboard statistics',
    data: CrmDashboardResponseDto,
    successDescription: 'Dashboard statistics retrieved successfully',
  }),
};

Object.entries(docs).forEach(([key, value]) => registerSwaggerDocs(key, value));
