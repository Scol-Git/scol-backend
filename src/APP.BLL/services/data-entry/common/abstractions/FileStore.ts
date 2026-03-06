/**
 * File metadata returned when listing a directory.
 */
export interface FileEntry {
  name: string;
  path: string;
  lastModified: Date;
}

/**
 * Abstraction for file operations. Used by import jobs to read/write
 * staging, reviewed, errors, and archive folders without depending on fs directly.
 */
export interface FileStore {
  listFiles(folderPath: string): Promise<FileEntry[]>;
  readFile(filePath: string): Promise<string>;
  writeFile(filePath: string, content: string | Buffer): Promise<void>;
  moveFile(fromPath: string, toPath: string): Promise<void>;
  ensureDir(dirPath: string): Promise<void>;
  resolvePath(...relativeSegments: string[]): string;
}
