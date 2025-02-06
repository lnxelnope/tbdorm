import { StreamingTextResponse, Message } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const response = await fetch('https://api.qwen.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.QWEN_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'qwen-max',
      messages: messages.map((message: Message) => ({
        role: message.role,
        content: message.content,
      })),
      stream: true,
    }),
  });

  // แปลง response เป็น ReadableStream
  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body?.getReader();
      if (!reader) return;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
      } finally {
        reader.releaseLock();
        controller.close();
      }
    },
  });

  return new StreamingTextResponse(stream);
}
