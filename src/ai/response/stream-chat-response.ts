import {
  convertToModelMessages,
  createGateway,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  LanguageModel,
} from "ai";

import type { GenerateModeChatUIMessage } from "../messages/types";
import { generateTools } from "../tools";
import generatePrompt from "./stream-chat-response-prompt";

type ExecuteParams = {
  writer: Parameters<
    Parameters<typeof createUIMessageStream>[0]["execute"]
  >[0]["writer"];
};

export const streamChatResponse = async (
  messages: GenerateModeChatUIMessage[],
  gatewayApiKey: string
) => {
  const model = createGateway({
    apiKey:
      gatewayApiKey === process.env.SECRET_KEY
        ? process.env.AI_GATEWAY_API_KEY
        : gatewayApiKey,
  })("openai/gpt-5.1-instant");

  return createUIMessageStreamResponse({
    stream: createUIMessageStream({
      originalMessages: messages,
      execute: async ({ writer }) => {
        const result = streamText({
          model,
          system: generatePrompt,
          messages: await convertToModelMessages(messages),
          stopWhen: stepCountIs(5),
          toolChoice: "required",
          tools: generateTools({ writer, gatewayApiKey }),
          onError: () => {
            // Error handling is done via toast notifications in the UI
          },
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
