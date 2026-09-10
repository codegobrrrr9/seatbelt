import OpenAI from 'openai';

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function summarize(text) {
  const r = await openai.chat.completions.create({
    model: 'gpt-5-mini',
    messages: [{ role: 'user', content: `Summarize: ${text}` }],
  });
  return r.choices[0].message.content;
}
