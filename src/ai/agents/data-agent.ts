import { createGateway, generateObject } from "ai";
import type { UIMessage, UIMessageStreamWriter } from "ai";
import { z } from "zod";

import type { DataPart } from "../messages/data-parts";
import type { SelectionContext } from "@/lib/selection-context";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type ColumnInfo = {
  id: string;
  label: string;
  variant: string;
  prompt?: string;
  options?: Array<{ label: string; value: string }>;
};

type CellTask = {
  rowIndex: number;
  columnId: string;
  column: ColumnInfo;
};

type RunDataAgentParams = {
  gatewayApiKey: string;
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>;
  selectionContext: SelectionContext;
  userMessage: string;
};

// -----------------------------------------------------------------------------
// Schema Builder
// -----------------------------------------------------------------------------

function buildCellSchema(column: ColumnInfo) {
  switch (column.variant) {
    case "number":
      return z.object({
        value: z.number().describe("A numeric value for this cell"),
      });

    case "checkbox":
      return z.object({
        value: z.boolean().describe("A boolean value (true or false)"),
      });

    case "date":
      return z.object({
        value: z
          .string()
          .describe("A date in ISO format (YYYY-MM-DD)"),
      });

    case "select": {
      if (column.options?.length) {
        const values = column.options.map((o) => o.value) as [string, ...string[]];
        return z.object({
          value: z.enum(values).describe("One of the valid options"),
        });
      }
      return z.object({
        value: z.string().describe("A single selection value"),
      });
    }

    case "multi-select": {
      if (column.options?.length) {
        const values = column.options.map((o) => o.value) as [string, ...string[]];
        return z.object({
          value: z.array(z.enum(values)).describe("Array of selected options"),
        });
      }
      return z.object({
        value: z.array(z.string()).describe("Array of selected values"),
      });
    }

    case "url":
      return z.object({
        value: z.string().url().describe("A valid URL"),
      });

    case "long-text":
      return z.object({
        value: z.string().describe("Multi-line text content"),
      });

    // short-text and default
    default:
      return z.object({
        value: z.string().describe("Text content for this cell"),
      });
  }
}

// -----------------------------------------------------------------------------
// Prompt Builder
// -----------------------------------------------------------------------------

function buildCellPrompt(task: CellTask, userMessage: string): string {
  const { column, rowIndex } = task;

  let prompt = `Generate a value for a spreadsheet cell.

Context: ${userMessage}

Cell Details:
- Column: "${column.label}" (type: ${column.variant})
- Row: ${rowIndex + 1}
`;

  if (column.prompt) {
    prompt += `- Instructions: ${column.prompt}\n`;
  }

  if (column.options && column.options.length > 0) {
    const optionValues = column.options.map((o) => o.value).join(", ");
    prompt += `- Valid options: ${optionValues}\n`;
  }

  prompt += `\nGenerate realistic, varied data appropriate for this cell.`;

  return prompt;
}

// -----------------------------------------------------------------------------
// Cell Processor
// -----------------------------------------------------------------------------

async function generateCellValue(
  model: ReturnType<ReturnType<typeof createGateway>>,
  task: CellTask,
  userMessage: string,
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>,
): Promise<void> {
  const prompt = buildCellPrompt(task, userMessage);
  const schema = buildCellSchema(task.column);

  try {
    const { object } = await generateObject({
      model,
      prompt,
      schema,
    });

    // Stream the update for this cell
    writer.write({
      id: `cell-${task.rowIndex}-${task.columnId}`,
      type: "data-enrich-data",
      data: {
        updates: [
          {
            rowIndex: task.rowIndex,
            columnId: task.columnId,
            value: object.value,
          },
        ],
        status: "done",
      },
    });

    console.log(
      `[DataAgent] Generated value for row ${task.rowIndex}, column ${task.columnId}:`,
      object.value
    );
  } catch (error) {
    console.error(
      `[DataAgent] Error generating value for row ${task.rowIndex}, column ${task.columnId}:`,
      error
    );
  }
}

// -----------------------------------------------------------------------------
// Batch Processor
// -----------------------------------------------------------------------------

async function processBatch<T>(
  items: T[],
  batchSize: number,
  processor: (item: T) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(processor));
  }
}

// -----------------------------------------------------------------------------
// Main Agent Function
// -----------------------------------------------------------------------------

const MAX_CONCURRENT_CELLS = 5;

/**
 * Runs the data agent to populate cells with AI-generated values.
 * Processes cells in batches of 5 for optimal concurrency.
 */
export async function runDataAgent({
  gatewayApiKey,
  writer,
  selectionContext,
  userMessage,
}: RunDataAgentParams): Promise<void> {
  const model = createGateway({
    apiKey:
      gatewayApiKey === process.env.SECRET_KEY
        ? process.env.AI_GATEWAY_API_KEY
        : gatewayApiKey,
  })("openai/gpt-5.1-instant");

  const { bounds, currentColumns } = selectionContext;

  // Build list of cell tasks from selected cells
  const tasks: CellTask[] = [];

  for (let rowIndex = bounds.minRow; rowIndex <= bounds.maxRow; rowIndex++) {
    for (const column of currentColumns) {
      // Only process cells within the selected columns
      if (bounds.columns.includes(column.id)) {
        tasks.push({
          rowIndex,
          columnId: column.id,
          column: column as ColumnInfo,
        });
      }
    }
  }

  console.log(
    `[DataAgent] Processing ${tasks.length} cells in batches of ${MAX_CONCURRENT_CELLS}`
  );

  // Process cells in batches of 5
  await processBatch(tasks, MAX_CONCURRENT_CELLS, (task) =>
    generateCellValue(model, task, userMessage, writer)
  );

  console.log("[DataAgent] Completed all cell updates");
}
