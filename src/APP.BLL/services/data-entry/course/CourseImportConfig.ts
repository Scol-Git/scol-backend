export interface CourseImportConfig {
  folders: {
    staging: string;
    reviewed: string;
    errors: string;
    archive: string;
  };
  readinessSeconds: number;
  allowMultipleFiles: boolean;
  /** Chunk size for prefetch / per-chunk in-memory caches within one import transaction. */
  batchSize: number;
}

export const defaultCourseImportConfig: CourseImportConfig = {
  folders: {
    staging: 'Staging',
    reviewed: 'Reviewed',
    errors: 'Errors',
    archive: 'Archive',
  },
  readinessSeconds: 3,
  allowMultipleFiles: false,
  batchSize: 50,
};
