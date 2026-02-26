import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const skillsCollection = defineCollection({
  loader: glob({ pattern: '*/SKILL.md', base: '../skills' }),
  schema: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

const instructionsCollection = defineCollection({
  loader: glob({ pattern: '*.instructions.md', base: '../instructions' }),
  schema: z.object({
    applyTo: z.string(),
    description: z.string().optional(),
  }),
});

const agentsCollection = defineCollection({
  loader: glob({ pattern: '*.agent.md', base: '../agents' }),
  schema: z.object({
    name: z.string(),
    description: z.string(),
    tags: z.array(z.string()).optional(),
  }),
});

const pluginsCollection = defineCollection({
  loader: glob({ pattern: '*/plugin.yaml', base: '../plugins' }),
  schema: z.object({
    name: z.string(),
    version: z.string(),
    description: z.string(),
    author: z.string().optional(),
    tags: z.array(z.string()).optional(),
    skills: z.array(z.string()),
  }),
});

export const collections = {
  skills: skillsCollection,
  instructions: instructionsCollection,
  agents: agentsCollection,
  plugins: pluginsCollection,
};
