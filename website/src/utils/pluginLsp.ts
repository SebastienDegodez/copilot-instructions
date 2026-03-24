import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

interface RawLspServerDefinition {
  command: string;
  args?: string[];
  fileExtensions?: Record<string, string>;
}

interface RawLspConfig {
  lspServers?: Record<string, RawLspServerDefinition>;
}

export interface PluginLspServer {
  name: string;
  command: string;
  args: string[];
  fileExtensions: Record<string, string>;
}

export async function loadPluginLspServers(
  slug: string,
  lspConfigFiles: string[] = [],
): Promise<PluginLspServer[]> {
  if (lspConfigFiles.length === 0) {
    return [];
  }

  const serverLists = await Promise.all(
    lspConfigFiles.map(async (configFile) => {
      try {
        const configPath = join(process.cwd(), '..', 'plugins', slug, configFile);
        const configText = await readFile(configPath, 'utf-8');
        const config = JSON.parse(configText) as RawLspConfig;

        return Object.entries(config.lspServers ?? {}).map(([name, definition]) => ({
          name,
          command: definition.command,
          args: definition.args ?? [],
          fileExtensions: definition.fileExtensions ?? {},
        }));
      } catch {
        return [];
      }
    }),
  );

  return serverLists.flat().sort((left, right) => left.name.localeCompare(right.name));
}