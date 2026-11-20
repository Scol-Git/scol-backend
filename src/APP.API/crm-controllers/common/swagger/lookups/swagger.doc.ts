import {
  SwaggerDocSet,
  registerSwaggerDocs,
} from '@api/common/swagger/swagger-docs.registry';
import { crmEndpoint } from '../wrapped-response';
import { CrmAcademicDegreesResponseDto } from '@shared/dtos/crm/lookups/CrmAcademicDegreesResponseDto';
import {
  CrmCitiesResponseDto,
  CrmCountriesResponseDto,
  CrmStatesResponseDto,
} from '@shared/dtos/crm/lookups/CrmGeoLookupResponseDto';
import { CrmProgrammesResponseDto } from '@shared/dtos/crm/lookups/CrmProgrammesResponseDto';

const docs: Record<string, SwaggerDocSet> = {
  'crmLookups.listAcademicDegrees': crmEndpoint({
    summary: 'List academic degrees for CRM editors',
    description:
      'Returns system academic degrees (id, name, levelOrder) for course requirement dropdowns.',
    data: CrmAcademicDegreesResponseDto,
    successDescription: 'Academic degrees retrieved successfully',
  }),
  'crmLookups.listProgrammes': crmEndpoint({
    summary: 'List programmes for CRM editors',
    description: 'All non-deleted programmes, including drafts, for the course programme dropdown.',
    data: CrmProgrammesResponseDto,
    successDescription: 'Programmes retrieved successfully',
  }),
  'crmLookups.listCountries': crmEndpoint({
    summary: 'List countries for CRM editors',
    description: 'All non-deleted countries, including drafts, for university location dropdowns.',
    data: CrmCountriesResponseDto,
    successDescription: 'Countries retrieved successfully',
  }),
  'crmLookups.listStates': crmEndpoint({
    summary: 'List states for a country',
    description: 'States in the given country, including drafts.',
    data: CrmStatesResponseDto,
    successDescription: 'States retrieved successfully',
  }),
  'crmLookups.listCities': crmEndpoint({
    summary: 'List cities for a state',
    description: 'Cities in the given state, including drafts.',
    data: CrmCitiesResponseDto,
    successDescription: 'Cities retrieved successfully',
  }),
};

Object.entries(docs).forEach(([key, value]) => registerSwaggerDocs(key, value));
