import type { Request, RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ProjectService } from '@/services/project.service.js';
import { ok, created } from '@/utils/apiResponse.js';
import { createProjectSchema } from '@/validators/project.validator.js';
import { getSession, requireAdminWriteAccess } from '@/services/auth.service.js';
import { IdentityAuditLogModel } from '@/models/identity.model.js';
import { NotificationModel } from '@/models/notification.model.js';

const service = new ProjectService();
type AuditChange = { field: string; label: string; oldValue: string; newValue: string };

const auditFieldLabels: Record<string, string> = {
  position: 'Position', name: 'Application name', slug: 'Slug', category: 'Category', description: 'Description',
  longDescription: 'Long description', technologies: 'Technologies', status: 'Status', version: 'Version',
  launchUrl: 'Live link', documentationUrl: 'Documentation link', docs: 'Documentation', features: 'Features',
  roadmap: 'Roadmap', metrics: 'Metrics', gradient: 'Card gradient', logo: 'Logo'
};

const comparableValue = (field: string, value: unknown) => {
  if (field === 'docs' && Array.isArray(value)) {
    return JSON.stringify(value.map((item) => {
      const doc = item as Record<string, unknown>;
      return { id: doc.id, name: doc.name, type: doc.type, content: doc.content, url: doc.url, size: doc.size, uploadedAt: doc.uploadedAt };
    }));
  }
  if (value instanceof Map) return JSON.stringify(Object.fromEntries(value));
  return JSON.stringify(value ?? null);
};

const summarizeAuditValue = (field: string, value: unknown) => {
  if (value === undefined || value === null || value === '') return 'Not set';
  let summary: string;
  if (field === 'docs' && Array.isArray(value)) {
    const names = value.map((item) => String((item as { name?: unknown })?.name ?? 'Document'));
    summary = names.length ? `${names.length} file${names.length === 1 ? '' : 's'}: ${names.join(', ')}` : 'No documents';
  } else if (Array.isArray(value)) {
    summary = value.length ? value.map((item) => String(item)).join(', ') : 'None';
  } else if (typeof value === 'object') {
    summary = JSON.stringify(value);
  } else {
    summary = String(value);
  }
  const compact = summary.replace(/\s+/g, ' ').trim();
  return compact.length > 180 ? `${compact.slice(0, 177)}...` : compact;
};

const buildProjectChanges = (previous: Record<string, unknown>, next: Record<string, unknown>): AuditChange[] =>
  Object.entries(auditFieldLabels).flatMap(([field, label]) => {
    if (comparableValue(field, previous[field]) === comparableValue(field, next[field])) return [];
    const oldValue = summarizeAuditValue(field, previous[field]);
    let newValue = summarizeAuditValue(field, next[field]);
    if (oldValue === newValue) newValue = `${newValue} (content changed)`;
    return [{ field, label, oldValue, newValue }];
  });

const notifyProjectChange = async (action: 'created' | 'updated', project: Record<string, unknown>) => {
  const name = String(project.name ?? project.slug ?? 'Application');
  await NotificationModel.create({
    title: action === 'created' ? `${name} added` : `${name} updated`,
    description: action === 'created'
      ? `${name} is now available in the SK Central application gallery.`
      : `${name} application information was updated in SK Central.`,
    group: 'Launches',
    readBy: [],
    metadata: { targetUrl: '/admin', action, resourceType: 'application', resourceName: name }
  });
};

const auditProjectChange = async (req: Request, action: string, project: Record<string, unknown>, changes: AuditChange[] = []) => {
  const current = await getSession(req);
  if (!current) return;
  await IdentityAuditLogModel.create({
    actorUserId: current.user.id,
    action,
    metadata: { resourceType: 'application', resourceId: String(project._id ?? project.slug ?? ''), resourceName: String(project.name ?? project.slug ?? 'Application'), slug: project.slug, ...(changes.length ? { changes } : {}) }
  });
};

export const listProjects: RequestHandler = async (_req, res) => {
  ok(res, await service.listProjects());
};

export const getProject: RequestHandler = async (req, res) => {
  const slug = String(req.params.slug);
  const project = await service.getProject(slug);
  if (!project) {
    res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Project not found' });
    return;
  }
  ok(res, project);
};

export const createProject: RequestHandler = async (req, res) => {
  await requireAdminWriteAccess(req);
  const input = createProjectSchema.parse(req.body);
  const project = await service.createProject(input);
  await auditProjectChange(req, 'application_created', project as unknown as Record<string, unknown>);
  await notifyProjectChange('created', project as unknown as Record<string, unknown>);
  created(res, project, 'Project created');
};

export const updateProject: RequestHandler = async (req, res) => {
  await requireAdminWriteAccess(req);
  const slug = String(req.params.slug);
  const input = createProjectSchema.parse(req.body);
  const previousProject = await service.getProject(slug);
  const project = await service.updateProject(slug, input);
  if (!project) {
    res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Project not found' });
    return;
  }
  const projectRecord = project as unknown as Record<string, unknown>;
  const changes = buildProjectChanges((previousProject ?? {}) as unknown as Record<string, unknown>, projectRecord);
  await auditProjectChange(req, 'application_updated', projectRecord, changes);
  await notifyProjectChange('updated', projectRecord);
  ok(res, project, 'Project updated');
};

export const deleteProject: RequestHandler = async (req, res) => {
  await requireAdminWriteAccess(req);
  const slug = String(req.params.slug);
  const project = await service.deleteProject(slug);
  if (!project) {
    res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Project not found' });
    return;
  }
  await auditProjectChange(req, 'application_deleted', project as unknown as Record<string, unknown>);
  ok(res, project, 'Project deleted');
};
