import { env } from '@/config/env.js';
import { ProjectModel } from '@/models/project.model.js';

interface ProviderResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

const providerModels = () => [...new Set([env.GEMINI_MODEL, 'gemini-2.0-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-latest'].filter(Boolean))];
const adminOnlyRequest = /\b(admin|administrator|audit(?:\s+log)?|activity\s+log|user\s+list|user\s+email|role|permission|session|credential|secret|token|otp|database|environment\s+variable)\b/i;

export class AIService {
  async respond(prompt: string) {
    if (adminOnlyRequest.test(prompt)) {
      return {
        role: 'assistant',
        content: 'I cannot access or discuss SK Central admin-only data, including users, roles, sessions, audit logs, credentials, or private configuration. I can answer questions about the public application catalog and its published details.',
        model: 'policy',
        tokenUsage: Math.max(24, prompt.length)
      };
    }

    const projects = await ProjectModel.find()
      .select('name slug position category description longDescription technologies status version launchUrl features roadmap updatedAt')
      .sort({ position: 1, createdAt: 1 })
      .lean()
      .catch(() => []);

    const publicContext = projects.map((project) => ({
      name: project.name,
      slug: project.slug,
      position: project.position,
      category: project.category,
      description: project.description,
      longDescription: project.longDescription,
      technologies: project.technologies,
      status: project.status,
      version: project.version,
      launchUrl: project.launchUrl,
      features: project.features,
      roadmap: project.roadmap,
      updatedAt: project.updatedAt
    }));

    if (!publicContext.length) {
      return {
        role: 'assistant',
        content: 'SK Central does not currently have live public application data available for this question. I will not invent an answer.',
        model: 'live-data-unavailable',
        tokenUsage: Math.max(24, prompt.length)
      };
    }

    const contextText = JSON.stringify({
      fetchedAt: new Date().toISOString(),
      applicationCount: publicContext.length,
      applications: publicContext
    });
    const fallbackContent = `I found ${publicContext.length} applications in the live SK Central catalog:

${publicContext
      .map((project) => `- **${project.name}** (${project.status}): ${project.description}${project.launchUrl ? ` — [Open application](${project.launchUrl})` : ''}`)
      .join('\n')}

Tell me what you want to accomplish and I can recommend the best available SK application from this live catalog.`;

    if (!env.GEMINI_API_KEY) {
      return {
        role: 'assistant',
        content: fallbackContent,
        model: 'live-catalog',
        tokenUsage: Math.max(24, prompt.length)
      };
    }

    const systemInstruction =
      'You are the SK Central public catalog assistant. Answer only from the live public application context fetched for this request. Never expose or infer admin pages, users, email lists, roles, permissions, sessions, audit logs, credentials, secrets, tokens, private configuration, or database details. When the user describes a goal, recommend one to three suitable available applications, explain why each matches, tell the user how to use it based only on published features, and include its launch URL when available. Consider status before recommending an application and clearly identify anything that is not live. If the answer is not present in the context, say that SK Central does not have that information available. Keep answers concise and state that recommendations come from the live SK Central catalog.';

    for (const model of providerModels()) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ role: 'user', parts: [{ text: `Live SK Central public context:\n${contextText}\n\nUser question:\n${prompt}` }] }],
            generationConfig: { temperature: 0.15, maxOutputTokens: 700 }
          })
        }
      );

      if (!response.ok) continue;
      const data = (await response.json()) as ProviderResponse;
      const content = data.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join('\n');
      if (content) {
        return { role: 'assistant', content, model: 'sk-central-ai', tokenUsage: Math.max(24, prompt.length) };
      }
    }

    return {
      role: 'assistant',
      content: fallbackContent,
      model: 'live-catalog',
      tokenUsage: Math.max(24, prompt.length)
    };
  }
}
