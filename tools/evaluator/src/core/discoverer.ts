import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { GitClient } from '../adapters/git-client.js';
import type { AssetKind, DiscoveredEntry, DiscoveryResult } from './types.js';

interface AssetPattern {
  regex: RegExp;
  kind: AssetKind;
  nameGroup: number;
}

const ASSET_PATTERNS: AssetPattern[] = [
  { regex: /^skills\/([^/]+)\//, kind: 'skill', nameGroup: 1 },
  { regex: /^plugins\/([^/]+)\//, kind: 'plugin', nameGroup: 1 },
  { regex: /^instructions\/([^.]+)\.instructions\.md$/, kind: 'instruction', nameGroup: 1 },
  { regex: /^tests\/skills\/([^/]+)\//, kind: 'skill', nameGroup: 1 },
  { regex: /^tests\/plugins\/([^/]+)\//, kind: 'plugin', nameGroup: 1 },
  { regex: /^tests\/instructions\/([^/]+)\//, kind: 'instruction', nameGroup: 1 },
];

const INFRA_PATTERNS: RegExp[] = [
  /^tools\/evaluator\//,
  /^\.github\/workflows\/evaluation(-run)?\.yml$/,
];

function buildAssetPath(kind: AssetKind, name: string): string {
  switch (kind) {
    case 'skill':
      return `skills/${name}`;
    case 'plugin':
      return `plugins/${name}`;
    case 'instruction':
      return `instructions/${name}.instructions.md`;
  }
}

function buildTestPath(kind: AssetKind, name: string, repoRoot: string): string | null {
  const testDir = (() => {
    switch (kind) {
      case 'skill':
        return `tests/skills/${name}`;
      case 'plugin':
        return `tests/plugins/${name}`;
      case 'instruction':
        return `tests/instructions/${name}`;
    }
  })();
  return existsSync(join(repoRoot, testDir)) ? testDir : null;
}

function detectChangedEntries(
  changedFiles: string[],
): Map<string, { kind: AssetKind; name: string; files: string[] }> {
  const entryMap = new Map<string, { kind: AssetKind; name: string; files: string[] }>();

  for (const file of changedFiles) {
    for (const pattern of ASSET_PATTERNS) {
      const match = pattern.regex.exec(file);
      if (match) {
        const name = match[pattern.nameGroup];
        if (!name) continue;
        const key = `${pattern.kind}:${name}`;
        const existing = entryMap.get(key);
        if (existing) {
          existing.files.push(file);
        } else {
          entryMap.set(key, { kind: pattern.kind, name, files: [file] });
        }
        break;
      }
    }
  }

  return entryMap;
}

function isInfraChange(changedFiles: string[]): boolean {
  return changedFiles.some((f) => INFRA_PATTERNS.some((p) => p.test(f)));
}

export async function discoverChangedEntries(
  gitClient: GitClient,
  repoRoot: string,
  baseRef: string,
  headRef: string,
): Promise<DiscoveryResult> {
  const changedFiles = await gitClient.getChangedFiles(baseRef, headRef);

  if (changedFiles.length === 0) {
    return {
      entries: [],
      isInfraChange: false,
      skipped: true,
      reason: 'No relevant files changed.',
    };
  }

  const infraChange = isInfraChange(changedFiles);

  if (infraChange) {
    const allEntries = await discoverAllEntries(repoRoot);
    return {
      entries: allEntries,
      isInfraChange: true,
      skipped: false,
      reason: 'Infrastructure change detected — evaluating all assets.',
    };
  }

  const entryMap = detectChangedEntries(changedFiles);

  if (entryMap.size === 0) {
    return {
      entries: [],
      isInfraChange: false,
      skipped: true,
      reason: 'No skill/plugin/instruction files changed.',
    };
  }

  const entries: DiscoveredEntry[] = Array.from(entryMap.entries()).map(([id, { kind, name, files }]) => ({
    id,
    kind,
    assetPath: buildAssetPath(kind, name),
    testPath: buildTestPath(kind, name, repoRoot),
    changedFiles: files,
  }));

  return {
    entries,
    isInfraChange: false,
    skipped: false,
    reason: `Found ${entries.length} changed asset(s) to evaluate.`,
  };
}

export async function discoverAllEntries(repoRoot: string): Promise<DiscoveredEntry[]> {
  const { readdirSync, statSync } = await import('node:fs');

  const entries: DiscoveredEntry[] = [];

  const collectDir = (dir: string, kind: AssetKind, buildPath: (name: string) => string) => {
    const fullDir = join(repoRoot, dir);
    if (!existsSync(fullDir)) return;
    for (const entry of readdirSync(fullDir)) {
      const fullPath = join(fullDir, entry);
      if (statSync(fullPath).isDirectory()) {
        const id = `${kind}:${entry}`;
        entries.push({
          id,
          kind,
          assetPath: buildPath(entry),
          testPath: buildTestPath(kind, entry, repoRoot),
          changedFiles: [],
        });
      }
    }
  };

  collectDir('skills', 'skill', (name) => `skills/${name}`);
  collectDir('plugins', 'plugin', (name) => `plugins/${name}`);

  const instructionsDir = join(repoRoot, 'instructions');
  if (existsSync(instructionsDir)) {
    const { readdirSync } = await import('node:fs');
    for (const file of readdirSync(instructionsDir)) {
      const match = /^(.+)\.instructions\.md$/.exec(file);
      if (match) {
        const name = match[1];
        if (!name) continue;
        const id = `instruction:${name}`;
        entries.push({
          id,
          kind: 'instruction',
          assetPath: `instructions/${file}`,
          testPath: buildTestPath('instruction', name, repoRoot),
          changedFiles: [],
        });
      }
    }
  }

  return entries;
}
