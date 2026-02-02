import { streamChatResponse } from "@/ai/response/stream-chat-response";

import type { GenerateModeChatUIMessage } from "@/ai/messages/types";
import type { SelectionContext } from "@/lib/selection-context";
import type {
  ExistingColumn,
  ExistingFilter,
  ExistingSort,
} from "@/ai/agents/table-agent";

type BodyData = {
  messages: GenerateModeChatUIMessage[];
  gatewayApiKey?: string;
  selectionContext?: SelectionContext;
  existingColumns?: ExistingColumn[];
  existingFilters?: ExistingFilter[];
  existingSorts?: ExistingSort[];
};

export async function POST(request: Request) {
  const bodyData = (await request.json()) as BodyData;
  const {
    messages,
    gatewayApiKey,
    selectionContext,
    existingColumns,
    existingFilters,
    existingSorts,
  } = bodyData;

  // Local dev: always use env key. Production: use client key
  const apiKey =
    process.env.NODE_ENV === "development"
      ? process.env.AI_GATEWAY_API_KEY
      : gatewayApiKey;

  if (!apiKey) {
    return new Response("Gateway API key is required", { status: 400 });
  }

  return streamChatResponse(
    messages,
    apiKey,
    selectionContext ?? null,
    existingColumns,
    existingFilters,
    existingSorts,
  );
}
