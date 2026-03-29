export interface CourseImportConfig {
  folders: {
    staging: string;
    reviewed: string;
    errors: string;
    archive: string;
  };
  readinessSeconds: number;
  allowMultipleFiles: boolean;
  /** Rows per DB transaction when processing course CSV (see CourseImportProcessorService). */
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
