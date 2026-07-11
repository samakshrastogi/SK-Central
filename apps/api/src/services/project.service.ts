import { ProjectRepository } from '@/repositories/project.repository.js';

export class ProjectService {
  constructor(private readonly repository = new ProjectRepository()) {}

  listProjects() {
    return this.repository.findAll();
  }

  getProject(slug: string) {
    return this.repository.findBySlug(slug);
  }

  createProject(input: Record<string, unknown>) {
    return this.repository.create(input);
  }

  updateProject(slug: string, input: Record<string, unknown>) {
    return this.repository.updateBySlug(slug, input);
  }

  deleteProject(slug: string) {
    return this.repository.deleteBySlug(slug);
  }
}
