import mongoose from 'mongoose';
import { demoProjects } from '@/constants/demoData.js';
import { ProjectModel } from '@/models/project.model.js';

export class ProjectRepository {
  async findAll() {
    if (mongoose.connection.readyState !== 1) {
      return demoProjects;
    }
    const projects = await ProjectModel.find().lean();
    return projects.length ? projects : demoProjects;
  }

  async findBySlug(slug: string) {
    if (mongoose.connection.readyState !== 1) {
      return demoProjects.find((item) => item.slug === slug) ?? null;
    }
    const project = await ProjectModel.findOne({ slug }).lean();
    return project ?? demoProjects.find((item) => item.slug === slug) ?? null;
  }

  async create(input: Record<string, unknown>) {
    if (mongoose.connection.readyState !== 1) {
      throw Object.assign(new Error('MongoDB is not connected. Project creation is unavailable in demo mode.'), {
        statusCode: 503
      });
    }
    return ProjectModel.create(input);
  }
}
