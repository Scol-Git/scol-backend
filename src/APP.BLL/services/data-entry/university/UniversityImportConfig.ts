export interface UniversityImportConfig {
  folders: {
    staging: string;
    reviewed: string;
    errors: string;
    archive: string;
  };
  readinessSeconds: number;
  allowMultipleFiles: boolean;
}

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
