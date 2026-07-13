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
  name: z.string().min(2),
  slug: z.string().min(2),
  category: z.string().min(2),
  description: z.string().min(8),
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
