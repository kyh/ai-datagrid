import {
  createGateway,
  stepCountIs,
  ToolLoopAgent,
  type UIMessage,
  type UIMessageStreamWriter,
} from "ai";

import type { DataPart } from "./messages/data-parts";
import type { Metadata } from "./messages/metadata";
import { generateTools, type GenerateToolSet } from "./tools";
import generatePrompt from "./response/stream-chat-response-prompt";

export type SpreadsheetAgentUIMessage = UIMessage<
  Metadata,
  DataPart,
  GenerateToolSet
>;

type CreateAgentParams = {
  gatewayApiKey: string;
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>;
};

/**
 * Creates a spreadsheet agent with the AI SDK v6 ToolLoopAgent abstraction.
 *
 * The agent is configured with:
 * - Model: OpenAI GPT-5.1 via Vercel Gateway
 * - Instructions: Spreadsheet assistant system prompt
 * - Tools: generateColumns and enrichData
 * - Step limit: 5 steps max
 * - Tool choice: Required (always use a tool)
 */
export function createSpreadsheetAgent({
  gatewayApiKey,
  writer,
}: CreateAgentParams) {
  const model = createGateway({
    apiKey:
      gatewayApiKey === process.env.SECRET_KEY
        ? process.env.AI_GATEWAY_API_KEY
        : gatewayApiKey,
  })("openai/gpt-5.1-instant");

  return new ToolLoopAgent({
    model,
    instructions: generatePrompt,
    tools: generateTools({ writer }),
    stopWhen: stepCountIs(5),
    toolChoice: "required",
  });
}
