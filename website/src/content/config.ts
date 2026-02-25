import { defineCollection, z } from 'astro:content';

const skillsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

const instructionsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    applyTo: z.string(),
    description: z.string().optional(),
  }),
});

const agentsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    description: z.string(),
    tags: z.array(z.string()).optional(),
  }),
});

export const collections = {
  skills: skillsCollection,
  instructions: instructionsCollection,
  agents: agentsCollection,
};
