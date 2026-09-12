import OpenAI from 'openai';

export const openai = new OpenAI({ apiKey: 'sk-proj-TbHdpWocrY5UtpT12vTPKHGAY7VNEmiGpyobAsoJAqEjgkJG' });

export async function summarize(text) {
  const r = await openai.chat.completions.create({
    model: 'gpt-5-mini',
    messages: [{ role: 'user', content: `Summarize: ${text}` }],
  });
  return r.choices[0].message.content;
}
