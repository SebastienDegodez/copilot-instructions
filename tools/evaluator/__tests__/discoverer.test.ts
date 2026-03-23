import { describe, it, expect, vi } from 'vitest';
import { discoverChangedEntries, discoverAllEntries } from '../src/core/discoverer.js';
import type { GitClient } from '../src/adapters/git-client.js';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, 'fixtures');

function makeMockGitClient(files: string[]): GitClient {
  return {
    getChangedFiles: vi.fn().mockResolvedValue(files),
    getCurrentSha: vi.fn().mockResolvedValue('abc123'),
  };
}

describe('discoverChangedEntries', () => {
  it('returns skipped=true when no files changed', async () => {
    const gitClient = makeMockGitClient([]);
    const result = await discoverChangedEntries(gitClient, FIXTURES_DIR, 'origin/main', 'HEAD');
    expect(result.skipped).toBe(true);
    expect(result.entries).toHaveLength(0);
  });

  it('detects changed skill', async () => {
    const gitClient = makeMockGitClient(['skills/my-skill/SKILL.md']);
    const result = await discoverChangedEntries(gitClient, FIXTURES_DIR, 'origin/main', 'HEAD');
    expect(result.skipped).toBe(false);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.id).toBe('skill:my-skill');
    expect(result.entries[0]?.kind).toBe('skill');
    expect(result.entries[0]?.assetPath).toBe('skills/my-skill');
  });

  it('detects changed plugin', async () => {
    const gitClient = makeMockGitClient(['plugins/my-plugin/plugin.yaml']);
    const result = await discoverChangedEntries(gitClient, FIXTURES_DIR, 'origin/main', 'HEAD');
    expect(result.skipped).toBe(false);
    expect(result.entries[0]?.id).toBe('plugin:my-plugin');
  });

  it('detects changed instruction', async () => {
    const gitClient = makeMockGitClient(['instructions/clean-architecture.instructions.md']);
    const result = await discoverChangedEntries(gitClient, FIXTURES_DIR, 'origin/main', 'HEAD');
    expect(result.skipped).toBe(false);
    expect(result.entries[0]?.id).toBe('instruction:clean-architecture');
    expect(result.entries[0]?.assetPath).toBe('instructions/clean-architecture.instructions.md');
  });

  it('deduplicates multiple files from same skill', async () => {
    const gitClient = makeMockGitClient([
      'skills/my-skill/SKILL.md',
      'skills/my-skill/references/ref.md',
    ]);
    const result = await discoverChangedEntries(gitClient, FIXTURES_DIR, 'origin/main', 'HEAD');
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.changedFiles).toHaveLength(2);
  });

  it('triggers infra change when evaluator tool files change', async () => {
    const gitClient = makeMockGitClient(['tools/evaluator/src/index.ts']);
    const result = await discoverChangedEntries(gitClient, FIXTURES_DIR, 'origin/main', 'HEAD');
    expect(result.isInfraChange).toBe(true);
  });

  it('triggers infra change when evaluation workflow changes', async () => {
    const gitClient = makeMockGitClient(['.github/workflows/evaluation.yml']);
    const result = await discoverChangedEntries(gitClient, FIXTURES_DIR, 'origin/main', 'HEAD');
    expect(result.isInfraChange).toBe(true);
  });

  it('detects tests/ path as triggering skill evaluation', async () => {
    const gitClient = makeMockGitClient(['tests/skills/my-skill/scenarios.yaml']);
    const result = await discoverChangedEntries(gitClient, FIXTURES_DIR, 'origin/main', 'HEAD');
    expect(result.entries[0]?.id).toBe('skill:my-skill');
  });

  it('returns skipped=true for non-asset changes', async () => {
    const gitClient = makeMockGitClient(['README.md', 'website/src/pages/index.astro']);
    const result = await discoverChangedEntries(gitClient, FIXTURES_DIR, 'origin/main', 'HEAD');
    expect(result.skipped).toBe(true);
    expect(result.entries).toHaveLength(0);
  });
});
