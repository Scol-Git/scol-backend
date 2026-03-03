import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { readdir, readFile, writeFile, mkdir, rename, stat } from 'fs/promises';
import type { IFileStore, FileEntry } from '../abstractions/IFileStore';

/**
 * File store backed by the local filesystem for bulk import folders.
 * Base path is injected (e.g. from env or config) for configurability.
 */
@Injectable()
export class LocalBulkImportFileStore implements IFileStore {
  constructor(private readonly basePath: string) {}

  resolvePath(...relativeSegments: string[]): string {
    return path.join(this.basePath, ...relativeSegments);
  }

  async listFiles(folderPath: string): Promise<FileEntry[]> {
    const dir = this.resolvePath(folderPath);
    let entries: Awaited<ReturnType<typeof readdir>>;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === 'ENOENT') return [];
      throw err;
    }
    const result: FileEntry[] = [];
    for (const e of entries) {
      if (!e.isFile()) continue;
      const fullPath = path.join(dir, e.name);
      const st = await stat(fullPath);
      result.push({
        name: e.name,
        path: fullPath,
        lastModified: st.mtime,
      });
    }
    return result;
  }

  async readFile(filePath: string): Promise<string> {
    const full = path.isAbsolute(filePath) ? filePath : this.resolvePath(filePath);
    const buf = await readFile(full, 'utf-8');
    return buf.replace(/^\uFEFF/, '');
  }

  async writeFile(filePath: string, content: string | Buffer): Promise<void> {
    const full = path.isAbsolute(filePath) ? filePath : this.resolvePath(filePath);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, content, typeof content === 'string' ? 'utf-8' : undefined);
  }

  async moveFile(fromPath: string, toPath: string): Promise<void> {
    const from = path.isAbsolute(fromPath) ? fromPath : this.resolvePath(fromPath);
    const to = path.isAbsolute(toPath) ? toPath : this.resolvePath(toPath);
    await mkdir(path.dirname(to), { recursive: true });
    await rename(from, to);
  }

  async ensureDir(dirPath: string): Promise<void> {
    const full = path.isAbsolute(dirPath) ? dirPath : this.resolvePath(dirPath);
    await mkdir(full, { recursive: true });
  }
}
