// lib/ai/groq.ts
import Groq from 'groq-sdk';

export type GeneratedGamingEvent = {
  title: string;
  summary: string;
  content: string;
  tags: string[];
};

export type GenerateEventInput = {
  instructions: string;
  sourceText: string;
  imageUrl?: string | null;
};

const groqApiKey = process.env.GROQ_API_KEY;

export const groq = groqApiKey ? new Groq({ apiKey: groqApiKey }) : null;

function validateGeneratedArticle(value: unknown): GeneratedGamingEvent {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('La réponse Groq n’est pas un article JSON valide.');
  }

  const article = value as Record<string, unknown>;
  const title = typeof article.title === 'string' ? article.title.trim() : '';
  const summary = typeof article.summary === 'string' ? article.summary.trim() : '';
  const content = typeof article.content === 'string' ? article.content.trim() : '';
  if (!title || !summary || !content) {
    throw new Error('La réponse Groq ne contient pas le titre, le résumé et le contenu requis.');
  }

  const tags = Array.isArray(article.tags)
    ? article.tags.filter((tag): tag is string => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean).slice(0, 10)
    : [];

  return { title, summary, content, tags };
}

export async function generateEventArticle(input: GenerateEventInput): Promise<GeneratedGamingEvent> {
  if (!groq) {
    throw new Error('GROQ_API_KEY n’est pas configurée. Aucun article de démonstration ne sera généré.');
  }

  const prompt = [
    `Consignes de l’administrateur :\n${input.instructions.trim()}`,
    input.sourceText.trim() ? `Informations fournies :\n${input.sourceText.trim()}` : '',
    'Rédige en français sans inventer de faits absents des informations ou de l’image. Retourne un JSON avec title, summary, content et tags (tableau de chaînes).',
  ].filter(Boolean).join('\n\n');
  const userContent = input.imageUrl
    ? [
        { type: 'text' as const, text: prompt },
        { type: 'image_url' as const, image_url: { url: input.imageUrl } },
      ]
    : prompt;

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Tu es un rédacteur gaming pour BMF. Crée un article clair, fidèle aux éléments fournis et prêt à être relu par un administrateur.',
      },
      { role: 'user', content: userContent },
    ],
    model: process.env.GROQ_VISION_MODEL ?? 'qwen/qwen3.8-27b',
    response_format: { type: 'json_object' },
  });

  const response = completion.choices[0]?.message?.content ?? '{}';
  return validateGeneratedArticle(JSON.parse(response) as unknown);
}
