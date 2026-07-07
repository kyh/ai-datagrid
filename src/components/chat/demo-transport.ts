import { StaticChatTransport } from "@loremllm/transport";
import type { z } from "zod";

import type { columnDefinitionSchema } from "@/ai/messages/data-parts";
import type { GenerateModeChatUIMessage } from "@/ai/messages/types";

/**
 * Scripted demo exchange for keyless "demo" mode: a single
 * "generate columns for a CRM" turn exercising the generateColumns tool.
 * Wired into useChat when the stored gateway key is "demo".
 */
const demoColumns: z.infer<typeof columnDefinitionSchema>[] = [
  {
    id: "name",
    label: "Name",
    variant: "short-text",
    prompt: "Generate a realistic full name for a CRM contact",
  },
  {
    id: "company",
    label: "Company",
    variant: "short-text",
    prompt: "Generate a plausible company name",
  },
  {
    id: "email",
    label: "Email",
    variant: "short-text",
    prompt: "Generate a professional email address matching the contact's name and company",
  },
  {
    id: "status",
    label: "Status",
    variant: "select",
    options: [
      { label: "Lead", value: "lead" },
      { label: "Contacted", value: "contacted" },
      { label: "Customer", value: "customer" },
      { label: "Churned", value: "churned" },
    ],
  },
  { id: "last-contacted", label: "Last Contacted", variant: "date" },
  {
    id: "notes",
    label: "Notes",
    variant: "long-text",
    prompt: "Write a short note summarizing the latest interaction",
  },
];

export const demoTransport = new StaticChatTransport<GenerateModeChatUIMessage>({
  chunkDelayMs: [50, 200],
  async *mockResponse() {
    yield { type: "step-start" };

    yield {
      type: "tool-generateColumns",
      toolCallId: "call_demo_generate_columns",
      state: "input-available",
      input: { columns: demoColumns },
    };

    yield {
      type: "tool-generateColumns",
      toolCallId: "call_demo_generate_columns",
      state: "output-available",
      input: { columns: demoColumns },
      output: `Successfully generated ${demoColumns.length} columns.`,
    };

    yield {
      type: "data-generate-columns",
      id: "call_demo_generate_columns",
      data: { columns: demoColumns, status: "done" },
    };
  },
});
