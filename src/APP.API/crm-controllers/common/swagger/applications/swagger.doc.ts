import {
  SwaggerDocSet,
  registerSwaggerDocs,
} from '@api/common/swagger/swagger-docs.registry';
import { crmEndpoint } from '../wrapped-response';
import { ChangeCrmApplicationDocumentStatusResponseDto } from '@shared/dtos/applications/ChangeCrmApplicationDocumentStatusResponseDto';
import { ChangeCrmApplicationRequirementStatusResponseDto } from '@shared/dtos/applications/ChangeCrmApplicationRequirementStatusResponseDto';
import { ChangeCrmApplicationStageResponseDto } from '@shared/dtos/applications/ChangeCrmApplicationStageResponseDto';
import { ChangeCrmApplicationStatusResponseDto } from '@shared/dtos/applications/ChangeCrmApplicationStatusResponseDto';
import { ConfirmApplicationDocumentUploadResponseDto } from '@shared/dtos/applications/ConfirmApplicationDocumentUploadResponseDto';
import { CreateApplicationResponseDto } from '@shared/dtos/applications/CreateApplicationResponseDto';
import { CreateCrmApplicationNoteResponseDto } from '@shared/dtos/applications/CreateCrmApplicationNoteResponseDto';
import { DeleteCrmApplicationNoteResponseDto } from '@shared/dtos/applications/DeleteCrmApplicationNoteResponseDto';
import { GenerateApplicationDocumentDownloadResponseDto } from '@shared/dtos/applications/GenerateApplicationDocumentDownloadResponseDto';
import { GenerateApplicationDocumentUploadUrlResponseDto } from '@shared/dtos/applications/GenerateApplicationDocumentUploadUrlResponseDto';
import { GetApplicationDocumentProgressResponseDto } from '@shared/dtos/applications/GetApplicationDocumentProgressResponseDto';
import { GetApplicationStageProgressResponseDto } from '@shared/dtos/applications/GetApplicationStageProgressResponseDto';
import { GetApplicationsResponseDto } from '@shared/dtos/applications/GetApplicationsResponseDto';
import { GetCrmApplicationActivitiesResponseDto } from '@shared/dtos/applications/GetCrmApplicationActivitiesResponseDto';
import { GetCrmApplicationDetailsResponseDto } from '@shared/dtos/applications/GetCrmApplicationDetailsResponseDto';
import { GetCrmApplicationNotesResponseDto } from '@shared/dtos/applications/GetCrmApplicationNotesResponseDto';
import { UpdateCrmApplicationNoteResponseDto } from '@shared/dtos/applications/UpdateCrmApplicationNoteResponseDto';
import { CrmApplicationDropdownDataResponseDto } from '@shared/dtos/crm/applications/CrmApplicationDropdownDataResponseDto';
import { CrmApplicationListResponseDto } from '@shared/dtos/crm/applications/CrmApplicationListResponseDto';

const docs: Record<string, SwaggerDocSet> = {
  'crmApplications.getApplicationList': crmEndpoint({
    summary: 'List CRM applications',
    data: CrmApplicationListResponseDto,
    successDescription: 'Application list retrieved successfully',
  }),
  'crmApplications.getDropdownData': crmEndpoint({
    summary: 'Get CRM application dropdown data',
    data: CrmApplicationDropdownDataResponseDto,
    successDescription: 'Application dropdown data retrieved successfully',
  }),

  'crmLeadApplications.createApplicationForLead': crmEndpoint({
    summary: 'Create an application for a lead',
    data: CreateApplicationResponseDto,
    successDescription: 'Application created successfully',
    created: true,
    notFound: 'Lead not found',
  }),
  'crmLeadApplications.getApplicationsForLead': crmEndpoint({
    summary: 'List applications for a lead',
    data: GetApplicationsResponseDto,
    successDescription: 'Applications retrieved successfully',
    notFound: 'Lead not found',
  }),
  'crmLeadApplications.getApplicationStageProgress': crmEndpoint({
    summary: 'Get application stage progress',
    data: GetApplicationStageProgressResponseDto,
    successDescription: 'Application stage progress retrieved successfully',
    notFound: 'Lead or application not found',
  }),
  'crmLeadApplications.getApplicationDocumentProgress': crmEndpoint({
    summary: 'Get application document progress',
    data: GetApplicationDocumentProgressResponseDto,
    successDescription: 'Application document progress retrieved successfully',
    notFound: 'Lead or application not found',
  }),
  'crmLeadApplications.getApplicationActivities': crmEndpoint({
    summary: 'Get application activities',
    data: GetCrmApplicationActivitiesResponseDto,
    successDescription: 'Application activities retrieved successfully',
    notFound: 'Lead or application not found',
  }),
  'crmLeadApplications.changeApplicationStatus': crmEndpoint({
    summary: 'Change application status',
    data: ChangeCrmApplicationStatusResponseDto,
    successDescription: 'Application status updated successfully',
    notFound: 'Lead, application, or status not found',
  }),
  'crmLeadApplications.changeApplicationStage': crmEndpoint({
    summary: 'Change application stage',
    data: ChangeCrmApplicationStageResponseDto,
    successDescription: 'Application stage updated successfully',
    notFound: 'Lead, application, or stage not found',
  }),
  'crmLeadApplications.getApplicationById': crmEndpoint({
    summary: 'Get application details',
    data: GetCrmApplicationDetailsResponseDto,
    successDescription: 'Application details retrieved successfully',
    notFound: 'Lead or application not found',
  }),

  'crmApplicationDocuments.generateUploadUrl': crmEndpoint({
    summary: 'Generate application document upload URL',
    data: GenerateApplicationDocumentUploadUrlResponseDto,
    successDescription: 'Upload URL generated successfully',
    created: true,
    notFound: 'Lead, application, or document type not found',
  }),
  'crmApplicationDocuments.confirmUpload': crmEndpoint({
    summary: 'Confirm application document upload',
    data: ConfirmApplicationDocumentUploadResponseDto,
    successDescription: 'Document upload confirmed successfully',
    notFound: 'Lead, application, or document type not found',
  }),
  'crmApplicationDocuments.downloadDocument': crmEndpoint({
    summary: 'Generate application document download URL',
    data: GenerateApplicationDocumentDownloadResponseDto,
    successDescription: 'Download URL generated successfully',
    notFound: 'Lead, application, or document not found',
  }),
  'crmApplicationDocuments.changeDocumentStatus': crmEndpoint({
    summary: 'Change application document status',
    data: ChangeCrmApplicationDocumentStatusResponseDto,
    successDescription: 'Document status updated successfully',
    notFound: 'Lead, application, or document not found',
  }),
  'crmApplicationDocuments.changeRequirementStatus': crmEndpoint({
    summary: 'Change application requirement status',
    data: ChangeCrmApplicationRequirementStatusResponseDto,
    successDescription: 'Requirement status updated successfully',
    notFound: 'Lead, application, or requirement not found',
  }),

  'crmApplicationNotes.getApplicationNotes': crmEndpoint({
    summary: 'List application notes',
    data: GetCrmApplicationNotesResponseDto,
    successDescription: 'Application notes retrieved successfully',
    notFound: 'Lead or application not found',
  }),
  'crmApplicationNotes.createApplicationNote': crmEndpoint({
    summary: 'Create an application note',
    data: CreateCrmApplicationNoteResponseDto,
    successDescription: 'Application note created successfully',
    created: true,
    notFound: 'Lead or application not found',
  }),
  'crmApplicationNotes.updateApplicationNote': crmEndpoint({
    summary: 'Update an application note',
    data: UpdateCrmApplicationNoteResponseDto,
    successDescription: 'Application note updated successfully',
    notFound: 'Lead, application, or note not found',
  }),
  'crmApplicationNotes.deleteApplicationNote': crmEndpoint({
    summary: 'Delete an application note',
    data: DeleteCrmApplicationNoteResponseDto,
    successDescription: 'Application note deleted successfully',
    notFound: 'Lead, application, or note not found',
  }),
};

Object.entries(docs).forEach(([key, value]) => registerSwaggerDocs(key, value));
