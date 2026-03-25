import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { logger } from '../utils/logger.js';

export interface GitClient {
  getChangedFiles(baseRef: string, headRef: string): Promise<string[]>;
  getChangedFilesSince(commitSha: string): Promise<string[]>;
  getCurrentSha(): Promise<string>;
  getPathDigestAtRef(ref: string, path: string): Promise<string | null>;
}

export function createGitClient(repoRoot: string): GitClient {
  const exec = (cmd: string): string => {
    try {
      return execSync(cmd, { cwd: repoRoot, encoding: 'utf-8' }).trim();
    } catch (err) {
      logger.warn({ err, cmd }, 'Git command failed');
      return '';
    }
  };

  return {
    async getChangedFiles(baseRef: string, headRef: string): Promise<string[]> {
      logger.debug({ baseRef, headRef }, 'Getting changed files');

      const mergeBase = exec(`git merge-base ${baseRef} ${headRef}`);
      const ref = mergeBase || baseRef;

      const output = exec(
        `git diff --name-only --diff-filter=ACMR ${ref} ${headRef}`,
      );

      if (!output) return [];
      return output.split('\n').filter((line) => line.trim().length > 0);
    },

    async getChangedFilesSince(commitSha: string): Promise<string[]> {
      logger.debug({ commitSha }, 'Getting changed files since commit');
      if (!/^[0-9a-f]{7,40}$/i.test(commitSha)) {
        throw new Error(`Cannot resolve commit SHA: '${commitSha}' does not look like a valid git ref`);
      }
      try {
        const result = execSync(`git diff --name-only --diff-filter=ACMR ${commitSha} HEAD`, {
          cwd: repoRoot,
          encoding: 'utf-8',
        }).trim();
        if (!result) return [];
        return result.split('\n').filter((line) => line.trim().length > 0);
      } catch (err) {
        throw new Error(`Cannot resolve commit SHA '${commitSha}': ${String(err)}`);
      }
    },

    async getCurrentSha(): Promise<string> {
      return exec('git rev-parse HEAD');
    },

    async getPathDigestAtRef(ref: string, path: string): Promise<string | null> {
      logger.debug({ ref, path }, 'Computing path digest at ref');
      try {
        // Check if path is a file or directory at the given ref
        const objectType = execSync(`git cat-file -t ${ref}:${path}`, {
          cwd: repoRoot,
          encoding: 'utf-8',
        }).trim();

        const hash = createHash('sha256');

        if (objectType === 'blob') {
          // Single file: hash its content
          const content = execSync(`git show ${ref}:${path}`, {
            cwd: repoRoot,
            encoding: 'utf-8',
          });
          hash.update(content);
        } else if (objectType === 'tree') {
          // Directory: hash sorted relative file list + each file content hash
          const treeOutput = execSync(`git ls-tree -r --name-only ${ref} -- ${path}`, {
            cwd: repoRoot,
            encoding: 'utf-8',
          }).trim();
          const files = treeOutput ? treeOutput.split('\n').sort() : [];
          for (const file of files) {
            const fileContent = execSync(`git show ${ref}:${file}`, {
              cwd: repoRoot,
              encoding: 'utf-8',
            });
            const fileHash = createHash('sha256').update(fileContent).digest('hex');
            hash.update(`${file}:${fileHash}\n`);
          }
        } else {
          return null;
        }

        return hash.digest('hex');
      } catch {
        logger.warn({ ref, path }, 'Failed to compute path digest — path may not exist at this ref');
        return null;
      }
    },
  };
}
