import OpenAI from 'openai';
import { OpenAIStream, StreamingTextResponse } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
  });

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: messages.map((message: any) => ({
      role: message.role,
      content: message.content,
    })),
    stream: true,
  });

  const stream = OpenAIStream(response);
  return new StreamingTextResponse(stream);
}
