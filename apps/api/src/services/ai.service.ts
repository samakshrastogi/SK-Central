import { demoProjects } from '@/constants/demoData.js';
import { env } from '@/config/env.js';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

export class AIService {
  async respond(prompt: string) {
    const context = demoProjects
      .map((project) => `${project.name}: ${project.description}. Category: ${project.category}. Status: ${project.status}. Tech: ${project.technologies.join(', ')}`)
      .join('\n');

    const scopedFallback = {
      role: 'assistant',
      content:
        `I can help with SK Central applications and documentation only.\n\nAvailable application context:\n${context}\n\nYour question: ${prompt}\n\nAdd GEMINI_API_KEY in apps/api/.env to enable live Gemini responses.`,
      model: 'local-fallback',
      tokenUsage: Math.max(24, prompt.length)
    };

    if (!env.GEMINI_API_KEY) {
      return scopedFallback;
    }

    const systemInstruction =
      'You are SK Central AI Assistant. Answer only using SK Central application and documentation context. If a user asks unrelated questions, politely say you can only help with SK Central applications, documentation, analytics, and admin workflows.';

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `SK Central context:\n${context}\n\nUser question:\n${prompt}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 700
          }
        })
      }
    );

    if (!response.ok) {
      return {
        ...scopedFallback,
        content: `Gemini returned ${response.status}. I am using the local SK Central context fallback.\n\n${scopedFallback.content}`
      };
    }

    const data = (await response.json()) as GeminiResponse;
    const content =
      data.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join('\n') ??
      scopedFallback.content;

    return {
      role: 'assistant',
      content,
      model: env.GEMINI_MODEL,
      tokenUsage: Math.max(24, prompt.length)
    };
  }
}
