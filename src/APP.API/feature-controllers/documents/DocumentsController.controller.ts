// import {
//   Controller,
//   Post,
//   Get,
//   Body,
//   Param,
//   HttpCode,
//   HttpStatus,
// } from '@nestjs/common';
// import { ApiTags, ApiOperation } from '@nestjs/swagger';
// import { DocumentService } from '@bll/services/documents/DocumentService';
// import { CreateUploadUrlDto } from '@shared/dtos/documents/CreateUploadUrlDto';
// import { CreateUploadUrlResponseDto } from '@shared/dtos/documents/CreateUploadUrlResponseDto';
// import { ReuploadUrlDto } from '@shared/dtos/documents/ReuploadUrlDto';
// import { ConfirmUploadDto } from '@shared/dtos/documents/ConfirmUploadDto';
// import { DownloadUrlResponseDto } from '@shared/dtos/documents/DownloadUrlResponseDto';

// /**
//  * Documents Controller
//  *
//  * Presigned URL flow: upload-url (or :documentId/upload-url for re-upload) → client uploads to storage → confirm-upload.
//  * Download: GET download URL for current version.
//  */
// @ApiTags('documents')
// @Controller('documents')
// export class DocumentsController {
//   constructor(private readonly documentService: DocumentService) {}

//   @Post('upload-url')
//   @ApiOperation({
//     summary: 'Request presigned upload URL',
//     description:
//       'Creates document + version, returns presigned URL. Client uploads file directly to storage, then calls confirm-upload.',
//   })
//   async createUploadUrl(
//     @Body() dto: CreateUploadUrlDto,
//   ): Promise<CreateUploadUrlResponseDto> {
//     return this.documentService.createUploadUrl(dto);
//   }

//   @Post(':documentId/upload-url')
//   @ApiOperation({
//     summary: 'Request presigned URL for re-upload',
//     description:
//       'Creates a new version for an existing document. Returns presigned URL. Client uploads file, then calls confirm-upload. Document must already have at least one uploaded version.',
//   })
//   async createReuploadUrl(
//     @Param('documentId') documentId: string,
//     @Body() dto: ReuploadUrlDto,
//   ): Promise<CreateUploadUrlResponseDto> {
//     return this.documentService.createReuploadUrl(documentId, dto);
//   }

//   @Post('confirm-upload')
//   @HttpCode(HttpStatus.NO_CONTENT)
//   @ApiOperation({
//     summary: 'Confirm upload',
//     description:
//       'Verifies object exists in storage and marks version as uploaded.',
//   })
//   async confirmUpload(@Body() dto: ConfirmUploadDto): Promise<void> {
//     await this.documentService.confirmUpload(dto);
//   }

//   @Get(':documentId/download')
//   @ApiOperation({
//     summary: 'Get presigned download URL',
//     description:
//       'Returns a temporary URL to download the current document version.',
//   })
//   async getDownloadUrl(
//     @Param('documentId') documentId: string,
//   ): Promise<DownloadUrlResponseDto> {
//     return this.documentService.generateDownloadUrl(documentId);
//   }
// }
