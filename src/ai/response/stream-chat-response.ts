import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";

import type { GenerateModeChatUIMessage } from "../messages/types";
import type { SelectionContext } from "@/lib/selection-context";
import { createSpreadsheetAgent } from "../agent";

/**
 * Streams a chat response using the AI SDK v6 Agent abstraction.
 *
 * This function creates a ToolLoopAgent-based spreadsheet assistant that can:
 * - Generate column definitions
 * - Enrich data in the spreadsheet
 *
 * The agent runs in a tool loop for up to 5 steps, with tool choice required.
 */
export const streamChatResponse = async (
  messages: GenerateModeChatUIMessage[],
  gatewayApiKey: string,
  selectionContext: SelectionContext | null
) => {
  return createUIMessageStreamResponse({
    stream: createUIMessageStream({
      originalMessages: messages,
      execute: async ({ writer }) => {
        const agent = createSpreadsheetAgent({
          gatewayApiKey,
          writer,
          selectionContext,
        });

        const result = await agent.stream({
          messages: await convertToModelMessages(messages),
        });

        void result.consumeStream();
        writer.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          })
        );
      },
    }),
  });
};
