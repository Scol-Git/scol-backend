import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { readdir, readFile, writeFile, mkdir, rename, stat } from 'fs/promises';
import type { FileStore, FileEntry } from '../abstractions/FileStore';

@Injectable()
export class LocalFileStore implements FileStore {
  constructor(private readonly basePath: string) {}

  resolvePath(...relativeSegments: string[]): string {
    return path.join(this.basePath, ...relativeSegments);
  }

  async listFiles(folderPath: string): Promise<FileEntry[]> {
    const dir = this.resolvePath(folderPath);
    let directoryEntries: Awaited<ReturnType<typeof readdir>>;
    try {
      directoryEntries = await readdir(dir, { withFileTypes: true });
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === 'ENOENT') return [];
      throw err;
    }
    const result: FileEntry[] = [];
    for (const dirent of directoryEntries) {
      if (!dirent.isFile()) continue;
      const fullPath = path.join(dir, dirent.name);
      const fileStats = await stat(fullPath);
      result.push({
        name: dirent.name,
        path: fullPath,
        lastModified: fileStats.mtime,
        sizeBytes: fileStats.size,
      });
    }
    return result;
  }

  async readFile(filePath: string): Promise<string> {
    const resolvedPath = path.isAbsolute(filePath) ? filePath : this.resolvePath(filePath);
    const content = await readFile(resolvedPath, 'utf-8');
    return content.replace(/^\uFEFF/, '');
  }

  async writeFile(filePath: string, content: string | Buffer): Promise<void> {
    const resolvedPath = path.isAbsolute(filePath) ? filePath : this.resolvePath(filePath);
    await mkdir(path.dirname(resolvedPath), { recursive: true });
    await writeFile(resolvedPath, content, typeof content === 'string' ? 'utf-8' : undefined);
  }

  async moveFile(fromPath: string, toPath: string): Promise<void> {
    const from = path.isAbsolute(fromPath) ? fromPath : this.resolvePath(fromPath);
    const to = path.isAbsolute(toPath) ? toPath : this.resolvePath(toPath);
    await mkdir(path.dirname(to), { recursive: true });
    await rename(from, to);
  }

  async ensureDir(dirPath: string): Promise<void> {
    const resolvedPath = path.isAbsolute(dirPath) ? dirPath : this.resolvePath(dirPath);
    await mkdir(resolvedPath, { recursive: true });
  }
}
