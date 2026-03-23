import { z } from 'zod';

export const ExpectationsSchema = z.object({
  keywords: z.array(z.string()).optional(),
  patterns: z.array(z.string()).optional(),
});

export const JudgeCriteriaSchema = z.object({
  criteria: z.string(),
  passing_score: z.number().min(0).max(10).default(7.0),
});

export const ScenarioSchema = z.object({
  name: z.string(),
  description: z.string(),
  prompt: z.string(),
  expectations: ExpectationsSchema.optional(),
  judge: JudgeCriteriaSchema,
  timeout: z.number().positive().default(60),
  runs: z.number().int().positive().default(3),
});

export const ScenariosFileSchema = z.object({
  kind: z.enum(['skill', 'plugin', 'instruction']),
  ref: z.string(),
  scenarios: z.array(ScenarioSchema).min(1),
});

export type Expectations = z.infer<typeof ExpectationsSchema>;
export type JudgeCriteria = z.infer<typeof JudgeCriteriaSchema>;
export type Scenario = z.infer<typeof ScenarioSchema>;
export type ScenariosFile = z.infer<typeof ScenariosFileSchema>;
