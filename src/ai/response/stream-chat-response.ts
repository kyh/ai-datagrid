import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";

import type { GenerateModeChatUIMessage } from "../messages/types";
import type { SelectionContext } from "@/lib/selection-context";
import { createTableAgent, type ExistingColumn } from "../agents/table-agent";
import { runDataAgent } from "../agents/data-agent";

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

  // Extract the last user message for the data agent
  const lastUserMessage = messages.findLast((m) => m.role === "user");
  const userMessageText = lastUserMessage?.parts
    ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join(" ") ?? "";

  return createUIMessageStreamResponse({
    stream: createUIMessageStream({
      originalMessages: messages,
      execute: async ({ writer }) => {
        console.log(
          "[streamChatResponse] Processing request, hasSelectionContext:",
          !!selectionContext,
        );

        if (selectionContext) {
          // Use the new cell-by-cell data agent with batched concurrency
          await runDataAgent({
            gatewayApiKey,
            writer,
            selectionContext,
            userMessage: userMessageText,
          });
        } else {
          // Use the table agent for column management
          const agent = createTableAgent({
            gatewayApiKey,
            writer,
            existingColumns,
          });

          console.log("[streamChatResponse] Starting table agent stream");
          const result = await agent.stream({
            messages: await convertToModelMessages(messages),
          });

          void result.consumeStream();

          writer.merge(
            result.toUIMessageStream({
              sendReasoning: true,
            }),
          );
        }
      },
    }),
  });
};
