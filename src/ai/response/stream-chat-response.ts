import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";

import type { GenerateModeChatUIMessage } from "../messages/types";
import type { SelectionContext } from "@/lib/selection-context";
import { createTableAgent, type ExistingColumn } from "../agents/table-agent";
import { createDataAgent } from "../agents/data-agent";

/**
 * Streams a chat response using the AI SDK v6 Agent abstraction.
 *
 * This function creates a ToolLoopAgent-based spreadsheet assistant that can:
 * - Generate column definitions
 * - Update existing columns
 * - Delete columns
 * - Enrich data in the spreadsheet
 *
 * The agent runs in a tool loop for up to 5 steps, with tool choice required.
 */
export const streamChatResponse = async (
  messages: GenerateModeChatUIMessage[],
  gatewayApiKey: string,
  selectionContext: SelectionContext | null,
  existingColumns?: ExistingColumn[],
) => {
  console.log(
    "[streamChatResponse] Called with selectionContext:",
    JSON.stringify(selectionContext, null, 2),
  );

  return createUIMessageStreamResponse({
    stream: createUIMessageStream({
      originalMessages: messages,
      execute: async ({ writer }) => {
        // Use specialized agent based on selection context
        console.log(
          "[streamChatResponse] Creating agent, hasSelectionContext:",
          !!selectionContext,
        );
        const agent = selectionContext
          ? createDataAgent({ gatewayApiKey, writer, selectionContext })
          : createTableAgent({ gatewayApiKey, writer, existingColumns });

        console.log("[streamChatResponse] Starting agent stream");
        const result = await agent.stream({
          messages: await convertToModelMessages(messages),
        });

        void result.consumeStream();

        writer.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          }),
        );
      },
    }),
  });
};
