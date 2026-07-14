import mongoose from 'mongoose';
import { ProjectModel } from '@/models/project.model.js';

export class ProjectRepository {
  async findAll() {
    if (mongoose.connection.readyState !== 1) {
      return [];
    }
    return ProjectModel.find().sort({ position: 1, createdAt: 1 }).lean();
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
