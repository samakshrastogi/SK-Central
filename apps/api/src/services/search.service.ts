import { demoProjects } from '@/constants/demoData.js';

export class SearchService {
  search(query: string) {
    const normalized = query.toLowerCase();
    const projects = demoProjects.filter((project) =>
      [project.name, project.category, project.description, ...project.technologies].some((value) =>
        value.toLowerCase().includes(normalized)
      )
    );

    return {
      projects,
      documentation: projects.map((project) => ({ title: `${project.name} documentation`, slug: project.slug })),
      community: [{ title: `Discussions matching ${query}`, type: 'thread' }],
      users: [],
      videos: [],
      commands: ['Open admin panel', 'Launch demo', 'Show system health']
    };
  }
}
