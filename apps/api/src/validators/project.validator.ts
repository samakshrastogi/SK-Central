import { z } from 'zod';

const documentationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['md', 'pdf', 'docx']),
  content: z.string().optional(),
  url: z.string().optional(),
  size: z.number().optional(),
  uploadedAt: z.string().min(1)
});

export const createProjectSchema = z.object({
  name: z.string().trim().min(2, 'Application name must contain at least 2 characters.'),
  slug: z.string().trim().min(2, 'Application slug must contain at least 2 characters.').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Application slug must use lowercase letters, numbers, and hyphens.'),
  position: z.coerce.number().int().min(1, 'Position must be 1 or greater.').default(1),
  category: z.string().trim().min(2, 'Category must contain at least 2 characters.'),
  description: z.string().trim().min(8, 'Description must contain at least 8 characters.'),
  longDescription: z.string().optional(),
  technologies: z.array(z.string()).default([]),
  status: z.enum(['Planned', 'In Progress', 'Testing', 'Preview', 'Live', 'Maintenance']).default('Planned'),
  version: z.string().default('0.1.0'),
  launchUrl: z.string().optional(),
  documentationUrl: z.string().optional(),
  docs: z.array(documentationSchema).default([]),
  features: z.array(z.string()).default([]),
  roadmap: z.array(z.string()).default([]),
  metrics: z.record(z.string()).default({}),
  gradient: z.string().optional(),
  logo: z.string().optional()
});
