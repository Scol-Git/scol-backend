/**
 * File metadata returned when listing a directory.
 */
export interface FileEntry {
  name: string;
  path: string;
  lastModified: Date;
}

/**
 * Abstraction for local file operations. Used by import jobs to read/write
 * staging, reviewed, errors, and archive folders without depending on fs directly.
 */
export interface IFileStore {
  /**
   * List files in the given folder path (relative to the store's base path).
   * Returns file name, full path, and lastModified.
   */
  listFiles(folderPath: string): Promise<FileEntry[]>;

  /**
   * Read file content as UTF-8 string.
   */
  readFile(filePath: string): Promise<string>;

  /**
   * Write content (string or Buffer) to the given path.
   * Creates parent directories if needed.
   */
  writeFile(filePath: string, content: string | Buffer): Promise<void>;

  /**
   * Move a file from one path to another.
   */
  moveFile(fromPath: string, toPath: string): Promise<void>;

  /**
   * Ensure a directory exists (create recursively if needed).
   */
  ensureDir(dirPath: string): Promise<void>;

  /**
   * Resolve a path relative to the store's base (e.g. "Staging", "Reviewed").
   */
  resolvePath(...relativeSegments: string[]): string;
}
