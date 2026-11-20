import {
  SwaggerDocSet,
  registerSwaggerDocs,
} from '@api/common/swagger/swagger-docs.registry';
import { crmEndpoint } from '../wrapped-response';
import { CrmUniversityDetailsResponseDto } from '@shared/dtos/crm/universities/CrmUniversityDetailsResponseDto';
import { UpdateCrmUniversityResponseDto } from '@shared/dtos/crm/universities/UpdateCrmUniversityResponseDto';
import { CrmUniversityStageFlowResponseDto } from '@shared/dtos/crm/universities/CrmUniversityStageFlowResponseDto';
import { CrmUniversityListResponseDto } from '@shared/dtos/crm/universities/CrmUniversityListResponseDto';
import { PublishPreviewResponseDto } from '@shared/dtos/crm/bulk-imports/PublishPreviewResponseDto';
import { PublishResultResponseDto } from '@shared/dtos/crm/bulk-imports/PublishResultResponseDto';
import { SuccessResponseDto } from '@shared/dtos/common/SuccessResponseDto';
import { GenerateUniAssetUploadUrlResponseDto } from '@shared/dtos/crm/universities/GenerateUniAssetUploadUrlResponseDto';
import { ConfirmUniAssetUploadResponseDto } from '@shared/dtos/crm/universities/ConfirmUniAssetUploadResponseDto';
import {
  UniversityIntakePeriodsResponseDto,
  UpdateIntakeFeesResponseDto,
} from '@shared/dtos/crm/universities/UniversityIntakePeriodDto';

const docs: Record<string, SwaggerDocSet> = {
  'crmUniversities.listUniversities': crmEndpoint({
    summary: 'List CRM universities (published and draft)',
    description:
      'Filter by publishStatus (DRAFT | PUBLISHED | ALL, default ALL), importBatchId and name search. Draft universities may have zero courses, so they never appear in the course search.',
    data: CrmUniversityListResponseDto,
    successDescription: 'Paginated universities',
  }),
  'crmUniversities.publishPreview': crmEndpoint({
    summary: 'Preview publishing a university',
    description: 'Lists the draft country/state/city that would also be published and any blocking issues. ADMIN only.',
    data: PublishPreviewResponseDto,
    successDescription: 'Publish preview',
    notFound: 'University not found',
  }),
  'crmUniversities.publishUniversity': crmEndpoint({
    summary: 'Publish a university (no intakes required)',
    description: 'Publishes the university and its draft country/state/city. Idempotent. 422 with blockingIssues if required fields are missing. ADMIN only.',
    data: PublishResultResponseDto,
    successDescription: 'University published',
    notFound: 'University not found',
  }),
  'crmUniversities.listIntakes': crmEndpoint({
    summary: 'List intake periods for a published university',
    description:
      'Distinct intake month and year from draft and published courses. courseCount includes both. ADMIN only. 422 when the university is not published.',
    data: UniversityIntakePeriodsResponseDto,
    successDescription: 'Intake periods',
    notFound: 'University not found',
  }),
  'crmUniversities.updateIntakeFees': crmEndpoint({
    summary: 'Set deadline and application fee for one intake period',
    description:
      'Updates every draft and published course intake of this published university for the given month and year. Deadline is DD-MM-YYYY. Omit a field to leave it unchanged; null clears it. ADMIN only.',
    data: UpdateIntakeFeesResponseDto,
    successDescription: 'Intakes updated',
    notFound: 'University not found',
  }),
  'crmUniversities.deleteDraftUniversity': crmEndpoint({
    summary: 'Delete a never-published draft university',
    description: 'Only when isPublished=false, never published, and it has no courses. ADMIN only.',
    data: SuccessResponseDto,
    successDescription: 'Draft deleted',
    notFound: 'University not found',
  }),
  'crmUniversities.getUniversityDetails': crmEndpoint({
    summary: 'Get CRM university details',
    data: CrmUniversityDetailsResponseDto,
    successDescription: 'University details retrieved successfully',
    notFound: 'University not found',
  }),
  'crmUniversities.generateAssetUploadUrl': crmEndpoint({
    summary: 'Presign a university cover or logo upload',
    description:
      'Returns a presigned PUT URL for the public scol-assets bucket. Keys are {uniId}/cover and {uniId}/logo. JPEG, PNG, or WebP, up to 5 MB. ADMIN only.',
    data: GenerateUniAssetUploadUrlResponseDto,
    successDescription: 'Upload URL created',
    notFound: 'University not found',
  }),
  'crmUniversities.confirmAssetUpload': crmEndpoint({
    summary: 'Confirm a university cover or logo upload',
    description:
      'Checks the object in scol-assets, then saves the permanent public file URL on coverImageUrl or logoUrl. ADMIN only.',
    data: ConfirmUniAssetUploadResponseDto,
    successDescription: 'Image URL saved',
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
