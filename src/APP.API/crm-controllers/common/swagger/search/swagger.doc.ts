import {
  SwaggerDocSet,
  registerSwaggerDocs,
} from '@api/common/swagger/swagger-docs.registry';
import { crmEndpoint } from '../wrapped-response';
import { CrmCourseSearchResponseDto } from '@shared/dtos/crm/search/CrmCourseSearchResponseDto';
import { AdvancedFiltersResponseDto } from '@shared/dtos/search/AdvancedFiltersResponseDto';

const docs: Record<string, SwaggerDocSet> = {
  'crmSearch.search': crmEndpoint({
    summary: 'Search courses with text, filters, ranges, and flags',
    data: CrmCourseSearchResponseDto,
    successDescription: 'Course search results retrieved successfully',
  }),
  'crmSearch.getFilters': crmEndpoint({
    summary: 'Get available filter options for CRM course search',
    data: AdvancedFiltersResponseDto,
    successDescription: 'Search filters retrieved successfully',
  }),
};

Object.entries(docs).forEach(([key, value]) => registerSwaggerDocs(key, value));
