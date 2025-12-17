import { streamChatResponse } from "@/ai/response/stream-chat-response";

import type { GenerateModeChatUIMessage } from "@/ai/messages/types";

type BodyData = {
  messages: GenerateModeChatUIMessage[];
  gatewayApiKey?: string;
};

export async function POST(request: Request) {
  const bodyData = (await request.json()) as BodyData;
  const { messages, gatewayApiKey } = bodyData;

  if (!gatewayApiKey) {
    return new Response("Gateway API key is required", { status: 400 });
  }

  return streamChatResponse(messages, gatewayApiKey);
}
