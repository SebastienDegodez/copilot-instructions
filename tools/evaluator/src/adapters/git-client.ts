import { execSync } from 'node:child_process';
import { logger } from '../utils/logger.js';

export interface GitClient {
  getChangedFiles(baseRef: string, headRef: string): Promise<string[]>;
  getChangedFilesSince(commitSha: string): Promise<string[]>;
  getCurrentSha(): Promise<string>;
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
        logger.warn({ commitSha }, 'Invalid commit SHA format — skipping diff');
        return [];
      }
      const output = exec(`git diff --name-only --diff-filter=ACMR ${commitSha} HEAD`);
      if (!output) return [];
      return output.split('\n').filter((line) => line.trim().length > 0);
    },

    async getCurrentSha(): Promise<string> {
      return exec('git rev-parse HEAD');
    },
  };
}
