import {
  SwaggerDocSet,
  registerSwaggerDocs,
} from '@api/common/swagger/swagger-docs.registry';
import { crmEndpoint } from '../wrapped-response';
import { ChangeCrmApplicationDocumentStatusResponseDto } from '@shared/dtos/applications/ChangeCrmApplicationDocumentStatusResponseDto';
import { ChangeCrmLeadAcademicResultVerificationResponseDto } from '@shared/dtos/crm/leads/ChangeCrmLeadAcademicResultVerificationResponseDto';
import { ChangeCrmLeadEnglishTestResultVerificationResponseDto } from '@shared/dtos/crm/leads/ChangeCrmLeadEnglishTestResultVerificationResponseDto';
import { CreateCrmLeadResponseDto } from '@shared/dtos/crm/leads/CreateCrmLeadResponseDto';
import { CrmLeadDropdownDataResponseDto } from '@shared/dtos/crm/leads/CrmLeadDropdownDataResponseDto';
import { CrmLeadListResponseDto } from '@shared/dtos/crm/leads/CrmLeadListResponseDto';
import { DeleteCrmLeadResultResponseDto } from '@shared/dtos/crm/leads/DeleteCrmLeadResultResponseDto';
import { GetCrmLeadProfileResponseDto } from '@shared/dtos/crm/leads/GetCrmLeadProfileResponseDto';
import { UpdateCrmLeadAcademicResultsResponseDto } from '@shared/dtos/crm/leads/UpdateCrmLeadAcademicResultsResponseDto';
import { UpdateCrmLeadEnglishTestResultsResponseDto } from '@shared/dtos/crm/leads/UpdateCrmLeadEnglishTestResultsResponseDto';
import { UpdateCrmLeadResponseDto } from '@shared/dtos/crm/leads/UpdateCrmLeadResponseDto';

const docs: Record<string, SwaggerDocSet> = {
  'crmLeads.createLead': crmEndpoint({
    summary: 'Create a CRM lead',
    data: CreateCrmLeadResponseDto,
    successDescription: 'Lead created successfully',
    created: true,
    notFound: 'Consultant user not found',
  }),
  'crmLeads.getLeadList': crmEndpoint({
    summary: 'List CRM leads',
    data: CrmLeadListResponseDto,
    successDescription: 'Leads retrieved successfully',
  }),
  'crmLeads.getDropdownData': crmEndpoint({
    summary: 'Get CRM lead dropdown data',
    data: CrmLeadDropdownDataResponseDto,
    successDescription: 'Lead dropdown data retrieved successfully',
  }),
  'crmLeads.getLeadProfile': crmEndpoint({
    summary: 'Get CRM lead profile',
    data: GetCrmLeadProfileResponseDto,
    successDescription: 'Lead profile retrieved successfully',
    notFound: 'Lead not found',
  }),
  'crmLeads.updateAcademicResults': crmEndpoint({
    summary: 'Update CRM lead academic results',
    data: UpdateCrmLeadAcademicResultsResponseDto,
    successDescription: 'Academic results updated successfully',
    notFound: 'Lead not found',
  }),
  'crmLeads.changeAcademicResultVerification': crmEndpoint({
    summary: 'Change academic result verification status',
    data: ChangeCrmLeadAcademicResultVerificationResponseDto,
    successDescription: 'Academic result verification updated successfully',
    notFound: 'Lead or academic result not found',
  }),
  'crmLeads.deleteAcademicResult': crmEndpoint({
    summary: 'Delete CRM lead academic result',
    data: DeleteCrmLeadResultResponseDto,
    successDescription: 'Academic result deleted successfully',
    notFound: 'Lead or academic result not found',
  }),
  'crmLeads.updateEnglishTestResults': crmEndpoint({
    summary: 'Update CRM lead English test results',
    data: UpdateCrmLeadEnglishTestResultsResponseDto,
    successDescription: 'English test results updated successfully',
    notFound: 'Lead not found',
  }),
  'crmLeads.changeEnglishTestResultVerification': crmEndpoint({
    summary: 'Change English test result verification status',
    data: ChangeCrmLeadEnglishTestResultVerificationResponseDto,
    successDescription: 'English test result verification updated successfully',
    notFound: 'Lead or English test result not found',
  }),
  'crmLeads.deleteEnglishTestResult': crmEndpoint({
    summary: 'Delete CRM lead English test result',
    data: DeleteCrmLeadResultResponseDto,
    successDescription: 'English test result deleted successfully',
    notFound: 'Lead or English test result not found',
  }),
  'crmLeads.changeLeadDocumentStatus': crmEndpoint({
    summary: 'Change CRM lead document status',
    data: ChangeCrmApplicationDocumentStatusResponseDto,
    successDescription: 'Lead document status updated successfully',
    notFound: 'Lead or document not found',
  }),
  'crmLeads.updateLead': crmEndpoint({
    summary: 'Update a CRM lead',
    data: UpdateCrmLeadResponseDto,
    successDescription: 'Lead updated successfully',
    notFound: 'Lead not found',
  }),
};

Object.entries(docs).forEach(([key, value]) => registerSwaggerDocs(key, value));
