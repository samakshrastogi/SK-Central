import { ProjectModel } from '@/models/project.model.js';

export class SearchService {
  async search(query: string) {
    const normalized = query.toLowerCase();
    const allProjects = await ProjectModel.find().lean();
    const projects = allProjects.filter((project) =>
      [project.name, project.category, project.description, ...project.technologies].some((value) =>
        value.toLowerCase().includes(normalized)
      )
    );

    return {
      projects,
      documentation: projects.map((project) => ({ title: `${project.name} documentation`, slug: project.slug })),
      community: [],
      users: [],
      videos: [],
      commands: ['Open admin panel', 'Show system health']
    };
  }
}
