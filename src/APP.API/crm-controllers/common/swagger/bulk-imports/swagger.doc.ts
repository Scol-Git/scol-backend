import {
  SwaggerDocSet,
  registerSwaggerDocs,
} from '@api/common/swagger/swagger-docs.registry';
import { crmEndpoint } from '../wrapped-response';
import { GenerateBulkImportUploadUrlResponseDto } from '@shared/dtos/crm/bulk-imports/GenerateBulkImportUploadUrlResponseDto';
import { ConfirmBulkImportUploadResponseDto } from '@shared/dtos/crm/bulk-imports/ConfirmBulkImportUploadResponseDto';
import { BulkImportStatusResponseDto } from '@shared/dtos/crm/bulk-imports/BulkImportStatusResponseDto';
import { BulkImportListResponseDto } from '@shared/dtos/crm/bulk-imports/BulkImportListResponseDto';
import { BulkImportDetailResponseDto } from '@shared/dtos/crm/bulk-imports/BulkImportDetailResponseDto';
import { BulkImportDownloadResponseDto } from '@shared/dtos/crm/bulk-imports/BulkImportDownloadResponseDto';
import { PublishPreviewResponseDto } from '@shared/dtos/crm/bulk-imports/PublishPreviewResponseDto';
import { PublishResultResponseDto } from '@shared/dtos/crm/bulk-imports/PublishResultResponseDto';

const docs: Record<string, SwaggerDocSet> = {
  'crmBulkImports.generateUploadUrl': crmEndpoint({
    summary: 'Create a bulk import batch and get a presigned upload URL',
    description:
      'Validates the file name (.csv) and size, creates a batch (AWAITING_UPLOAD) and returns a presigned PUT URL valid for 15 minutes. Upload the file directly to storage with `PUT <uploadUrl>` (Content-Type: text/csv), then call confirm-upload. ADMIN only.',
    data: GenerateBulkImportUploadUrlResponseDto,
    successDescription: 'Upload URL created',
  }),
  'crmBulkImports.confirmUpload': crmEndpoint({
    summary: 'Confirm the file was uploaded and queue it for processing',
    description:
      'Returns 202. Poll GET /crm/bulk-imports/:batchId/status every 2–5 s until isFinal is true.',
    data: ConfirmBulkImportUploadResponseDto,
    successDescription: 'Batch queued (HTTP 202)',
    notFound: 'Batch not found',
  }),
  'crmBulkImports.getStatus': crmEndpoint({
    summary: 'Lightweight status polling for a batch',
    description: 'Single primary-key read. Stop polling when isFinal is true.',
    data: BulkImportStatusResponseDto,
    successDescription: 'Batch status',
    notFound: 'Batch not found',
  }),
  'crmBulkImports.list': crmEndpoint({
    summary: 'List bulk import batches (history)',
    data: BulkImportListResponseDto,
    successDescription: 'Paginated batches',
  }),
  'crmBulkImports.getDetail': crmEndpoint({
    summary: 'Batch detail with the live count of drafts it currently owns',
    data: BulkImportDetailResponseDto,
    successDescription: 'Batch detail',
    notFound: 'Batch not found',
  }),
  'crmBulkImports.downloadOriginal': crmEndpoint({
    summary: 'Presigned download URL for the uploaded CSV',
    description: '410 when the files were deleted by the retention job',
    data: BulkImportDownloadResponseDto,
    successDescription: 'Download URL',
    notFound: 'Batch not found',
  }),
  'crmBulkImports.downloadErrors': crmEndpoint({
    summary: 'Presigned download URL for errors.csv',
    description:
      '404 when the batch produced no errors or warnings. 410 when the files were deleted by the retention job',
    data: BulkImportDownloadResponseDto,
    successDescription: 'Download URL',
    notFound: 'Batch or errors file not found',
  }),
  'crmBulkImports.publishPreview': crmEndpoint({
    summary: 'Preview what publishing the batch will publish, and blocking issues',
    data: PublishPreviewResponseDto,
    successDescription: 'Publish preview',
    notFound: 'Batch not found',
  }),
  'crmBulkImports.publish': crmEndpoint({
    summary: 'Publish the batch (cascades to draft parents)',
    description:
      'University batch: publishes its universities (+ draft country/state/city). Course batch: publishes its intakes plus any still-draft course, university, programme and geo parents. 422 with blockingIssues if required fields are missing; 409 if the batch is not IN_REVIEW.',
    data: PublishResultResponseDto,
    successDescription: 'Published',
    notFound: 'Batch not found',
  }),
  'crmBulkImports.discard': crmEndpoint({
    summary: 'Discard the batch and delete the never-published drafts it currently owns',
    description: 'Files in storage are kept for audit.',
    data: BulkImportStatusResponseDto,
    successDescription: 'Batch discarded',
    notFound: 'Batch not found',
  }),
};

Object.entries(docs).forEach(([key, value]) => registerSwaggerDocs(key, value));
