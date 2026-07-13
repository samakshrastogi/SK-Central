import { env } from '@/config/env.js';
import { demoProjects } from '@/constants/demoData.js';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

const geminiModels = () => [...new Set([env.GEMINI_MODEL, 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-latest'].filter(Boolean))];

export class AIService {
  async respond(prompt: string) {
    const context = demoProjects
      .map((project) => `${project.name}: ${project.description}. Category: ${project.category}. Status: ${project.status}. Tech: ${project.technologies.join(', ')}`)
      .join('\n');

    const ecosystemContext = [
      'SK Central: identity, managed applications, documentation, analytics, admin roles, activity logs, profile, and ecosystem support.',
      'SK Quiz Coach: adaptive exam prep, onboarding, study planning, quizzes, mentor chat, learner dashboard, and progress analytics.',
      'SK Auth: shared identity, email OTP, remembered accounts, profile avatar, single sign-on, and global logout/session checks.',
      context
    ].join('\n');

    const scopedFallback = {
      role: 'assistant',
      content:
        `I can help with SK Central, SK Quiz, SK Auth, connected applications, analytics, and documentation.\n\nAvailable SK ecosystem context:\n${ecosystemContext}\n\nYour question: ${prompt}\n\nAdd GEMINI_API_KEY in apps/api/.env to enable live Gemini responses.`,
      model: 'local-fallback',
      tokenUsage: Math.max(24, prompt.length)
    };

    if (!env.GEMINI_API_KEY) {
      return scopedFallback;
    }

    const systemInstruction =
      'You are the SK ecosystem AI Assistant. Answer using SK Central, SK Quiz Coach, SK Auth, managed application, analytics, documentation, and admin workflow context. If a user asks unrelated questions, politely redirect to SK ecosystem support.';

    let lastStatus = 0;
    let lastModel = env.GEMINI_MODEL;

    for (const model of geminiModels()) {
      lastModel = model;
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`,
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
                    text: `SK ecosystem context:\n${ecosystemContext}\n\nUser question:\n${prompt}`
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.35,
              maxOutputTokens: 900
            }
          })
        }
      );

      lastStatus = response.status;
      if (!response.ok) continue;

      const data = (await response.json()) as GeminiResponse;
      const content =
        data.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join('\n') ??
        scopedFallback.content;

      return {
        role: 'assistant',
        content,
        model,
        tokenUsage: Math.max(24, prompt.length)
      };
    }

    return {
      ...scopedFallback,
      content: `Gemini returned ${lastStatus} for ${lastModel}. I am using the local SK ecosystem context fallback.\n\n${scopedFallback.content}`
    };
  }
}
