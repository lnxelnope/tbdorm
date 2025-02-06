import { Anthropic } from "@anthropic-ai/sdk";
import { StreamingTextResponse, Message } from "ai";

export const runtime = "edge";

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  });

  const response = await anthropic.messages.create({
    model: "claude-3-sonnet-20240229",
    max_tokens: 4096,
    messages: messages.map((message: Message) => ({
      role: message.role === 'user' ? 'user' : 'assistant',
      content: message.content,
    })),
    stream: true,
  });

  return new StreamingTextResponse(response.toReadableStream());
}
