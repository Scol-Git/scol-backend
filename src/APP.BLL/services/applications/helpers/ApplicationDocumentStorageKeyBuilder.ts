import { Injectable } from '@nestjs/common';

@Injectable()
export class ApplicationDocumentStorageKeyBuilder {
  buildApplicationScopedStorageKey(
    applicationId: string,
    requirementId: string,
    applicationDocumentId: string,
    versionNumber: number,
    safeFileName: string,
  ): string {
    return `applications/${applicationId}/requirements/${requirementId}/documents/${applicationDocumentId}/versions/${versionNumber}/${safeFileName}`;
  }

  buildLeadScopedStorageKey(
    leadId: string,
    sysDocumentTypeId: string,
    leadDocumentId: string,
    versionNumber: number,
    safeFileName: string,
  ): string {
    return `leads/${leadId}/document-types/${sysDocumentTypeId}/documents/${leadDocumentId}/versions/${versionNumber}/${safeFileName}`;
  }

  sanitizeFileName(fileName: string): string {
    const base = fileName.replace(/\\/g, '/').split('/').pop() ?? fileName;
    const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^\.+/, '');
    const safe = cleaned.length > 200 ? cleaned.slice(0, 200) : cleaned;
    return safe.length > 0 ? safe : 'file';
  }
}
