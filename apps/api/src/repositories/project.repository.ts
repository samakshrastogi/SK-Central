import mongoose from 'mongoose';
import { ProjectModel } from '@/models/project.model.js';

export class ProjectRepository {
  async findAll() {
    if (mongoose.connection.readyState !== 1) {
      return [];
    }

    const projects = await ProjectModel.find().sort({ createdAt: 1 }).lean();
    const usedPositions = new Set(
      projects
        .map((project) => project.position)
        .filter((position): position is number => Number.isInteger(position) && position > 0)
    );
    let nextPosition = 1;
    const backfills: Array<{ updateOne: { filter: { _id: unknown }; update: { $set: { position: number } } } }> = [];

    for (const project of projects) {
      if (Number.isInteger(project.position) && project.position > 0) continue;
      while (usedPositions.has(nextPosition)) nextPosition += 1;
      project.position = nextPosition;
      usedPositions.add(nextPosition);
      backfills.push({ updateOne: { filter: { _id: project._id }, update: { $set: { position: nextPosition } } } });
      nextPosition += 1;
    }

    if (backfills.length) await ProjectModel.bulkWrite(backfills);
    return projects.sort((left, right) => left.position - right.position || left.createdAt.getTime() - right.createdAt.getTime());
  }

  async findBySlug(slug: string) {
    if (mongoose.connection.readyState !== 1) {
      return null;
    }
    return ProjectModel.findOne({ slug }).lean();
  }

  async create(input: Record<string, unknown>) {
    if (mongoose.connection.readyState !== 1) {
      throw Object.assign(new Error('MongoDB is not connected. Project creation is unavailable in demo mode.'), {
        statusCode: 503
      });
    }
    return/**/ProjectModel.findOneAndUpdate({slug:input.slug},input,{new:true,upsert:true,runValidators:true}).lean();
  }

  async updateBySlug(slug: string, input: Record<string, unknown>) {
    if (mongoose.connection.readyState !== 1) {
      throw Object.assign(new Error('MongoDB is not connected. Project updates are unavailable.'), {
        statusCode: 503
      });
    }
    return ProjectModel.findOneAndUpdate({ slug }, input, { new: true, runValidators: true }).lean();
  }

  async deleteBySlug(slug: string) {
    if (mongoose.connection.readyState !== 1) {
      throw Object.assign(new Error('MongoDB is not connected. Project deletion is unavailable.'), {
        statusCode: 503
      });
    }
    return ProjectModel.findOneAndDelete({ slug }).lean();
  }
}
