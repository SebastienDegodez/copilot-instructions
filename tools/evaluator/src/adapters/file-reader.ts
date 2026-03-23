import { readFile as fsReadFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export interface FileReader {
  readFile(filePath: string): Promise<string>;
  exists(filePath: string): boolean;
  readFileRelative(repoRoot: string, relativePath: string): Promise<string>;
}

export function createFileReader(): FileReader {
  return {
    async readFile(filePath: string): Promise<string> {
      return fsReadFile(filePath, 'utf-8');
    },

    exists(filePath: string): boolean {
      return existsSync(filePath);
    },

    async readFileRelative(repoRoot: string, relativePath: string): Promise<string> {
      const fullPath = join(repoRoot, relativePath);
      return fsReadFile(fullPath, 'utf-8');
    },
  };
}
