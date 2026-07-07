import { validateUIMessages } from "ai";
import { z } from "zod";

import {
  existingColumnSchema,
  existingFilterSchema,
  existingSortSchema,
} from "@/ai/agents/table-agent";
import { dataPartSchemas } from "@/ai/messages/data-parts";
import type { GenerateModeChatUIMessage } from "@/ai/messages/types";
import { streamChatResponse } from "@/ai/response/stream-chat-response";
import { selectionContextSchema } from "@/lib/selection-context";

const bodySchema = z.object({
  messages: z.array(z.unknown()),
  gatewayApiKey: z.string().optional(),
  selectionContext: selectionContextSchema.optional(),
  existingColumns: z.array(existingColumnSchema).optional(),
  existingFilters: z.array(existingFilterSchema).optional(),
  existingSorts: z.array(existingSortSchema).optional(),
});

export async function POST(request: Request) {
  const parsedBody = bodySchema.safeParse(await request.json());

  if (!parsedBody.success) {
    return new Response("Invalid request body", { status: 400 });
  }

  const {
    messages: rawMessages,
    gatewayApiKey,
    selectionContext,
    existingColumns,
    existingFilters,
    existingSorts,
  } = parsedBody.data;

  let messages: GenerateModeChatUIMessage[];
  try {
    messages = await validateUIMessages<GenerateModeChatUIMessage>({
      messages: rawMessages,
      dataSchemas: dataPartSchemas,
    });
  } catch {
    return new Response("Invalid messages", { status: 400 });
  }

  // Resolve API key: dev uses env key, prod checks for secret key or uses client key
  const isLocal = process.env.NODE_ENV === "development";
  const isSecretKey = !!process.env.SECRET_KEY && gatewayApiKey === process.env.SECRET_KEY;
  const apiKey = isSecretKey || isLocal ? process.env.AI_GATEWAY_API_KEY : gatewayApiKey;

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
