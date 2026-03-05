/**
 * Configuration for university CSV bulk import (folders and behaviour).
 */
export interface UniversityImportConfig {
  folders: {
    staging: string;
    reviewed: string;
    errors: string;
    archive: string;
  };
  /** Seconds to wait after file lastModified before considering it ready to process. */
  readinessSeconds: number;
  /** If false, exactly one file in staging is required; more than one throws. */
  allowMultipleFiles: boolean;
}

/**
 * Default configuration for university CSV import. Override via env (BULK_IMPORT_UNIVERSITY_BASE_PATH) or DI.
 */
export const defaultUniversityImportConfig: UniversityImportConfig = {
  folders: {
    staging: 'Staging',
    reviewed: 'Reviewed',
    errors: 'Errors',
    archive: 'Archive',
  },
  readinessSeconds: 3,
  allowMultipleFiles: false,
};
