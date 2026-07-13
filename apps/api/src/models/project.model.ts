import { Schema, model } from 'mongoose';

const projectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    longDescription: { type: String },
    technologies: [{ type: String }],
    status: { type: String, enum: ['Planned', 'In Progress', 'Testing', 'Preview', 'Live', 'Maintenance'], default: 'Planned' },
    version: { type: String, default: '0.1.0' },
    launchUrl: { type: String },
    documentationUrl: { type: String },
    githubUrl: { type: String },
    docs: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        type: { type: String, enum: ['md', 'pdf', 'docx'], required: true },
        content: { type: String },
        url: { type: String },
        size: { type: Number },
        uploadedAt: { type: String, required: true }
      }
    ],
    features: [{ type: String }],
    gradient: { type: String },
    logo: { type: String },
    ownerTeam: { type: String },
    metrics: { type: Map, of: String, default: {} },
    roadmap: [{ type: String }],
    isFeatured: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const ProjectModel = model('Project', projectSchema);
