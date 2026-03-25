import { describe, expect, it } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGitClient } from '../src/adapters/git-client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..');

type GitClientWithDigest = ReturnType<typeof createGitClient> & {
  getPathDigestAtRef(ref: string, path: string): Promise<string | null>;
};

describe('createGitClient', () => {
  it('hashes a single file deterministically at a ref', async () => {
    const git = createGitClient(REPO_ROOT) as GitClientWithDigest;

    expect(typeof git.getPathDigestAtRef).toBe('function');

    const firstDigest = await git.getPathDigestAtRef('HEAD', 'instructions/clean-architecture.instructions.md');
    const secondDigest = await git.getPathDigestAtRef('HEAD', 'instructions/clean-architecture.instructions.md');

    expect(firstDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(secondDigest).toBe(firstDigest);
  });

  it('hashes a directory from its sorted relative file list plus content hashes', async () => {
    const git = createGitClient(REPO_ROOT) as GitClientWithDigest;

    expect(typeof git.getPathDigestAtRef).toBe('function');

    const firstDigest = await git.getPathDigestAtRef('HEAD', 'skills/setup-husky-dotnet');
    const secondDigest = await git.getPathDigestAtRef('HEAD', 'skills/setup-husky-dotnet');

    expect(firstDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(secondDigest).toBe(firstDigest);
  });
});