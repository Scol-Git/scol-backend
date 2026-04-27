import { ApiProperty } from '@nestjs/swagger';
import { DocumentUploadMetadataDto } from './DocumentUploadMetadataDto';

/**
 * Request body for re-upload (new version of an existing document).
 * documentId is provided in the route param.
 */
export class ReuploadUrlDto extends DocumentUploadMetadataDto {}
