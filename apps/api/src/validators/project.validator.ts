import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  category: z.string().min(2),
  description: z.string().min(8),
  technologies: z.array(z.string()).default([]),
  status: z.enum(['Live', 'Beta', 'Preview', 'Planned']).default('Planned'),
  version: z.string().default('0.1.0')
});
