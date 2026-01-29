import { createGateway, generateText } from "ai";
import type { UIMessage, UIMessageStreamWriter } from "ai";

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
// Prompt Builder
// -----------------------------------------------------------------------------

function buildCellPrompt(task: CellTask, userMessage: string): string {
  const { column, rowIndex } = task;

  let prompt = `You are a data generation assistant. Generate a single value for a spreadsheet cell.

## Context
User request: "${userMessage}"

## Cell Details
- Column: "${column.label}" (type: ${column.variant})
- Row number: ${rowIndex + 1}
`;

  if (column.prompt) {
    prompt += `- Column instructions: ${column.prompt}\n`;
  }

  if (column.options && column.options.length > 0) {
    const optionValues = column.options.map((o) => `"${o.value}"`).join(", ");
    prompt += `- Valid options: [${optionValues}]\n`;
  }

  prompt += `
## Output Rules
- Respond with ONLY the raw value, nothing else
- No quotes around the value (unless it's part of the actual value)
- No explanations, no prefixes like "Value:" or "Answer:"
- Match the column type:
  - short-text/long-text: Plain text
  - number: A number (no units or symbols)
  - date: ISO format (YYYY-MM-DD)
  - select: One of the valid options exactly
  - multi-select: Comma-separated valid options
  - checkbox: "true" or "false"
  - url: A valid URL

Generate realistic, varied data. Each row should have unique values.`;

  return prompt;
}

// -----------------------------------------------------------------------------
// Value Parser
// -----------------------------------------------------------------------------

function parseValue(text: string, variant: string, options?: Array<{ label: string; value: string }>): unknown {
  const trimmed = text.trim();

  switch (variant) {
    case "number": {
      const num = parseFloat(trimmed.replace(/[^0-9.-]/g, ""));
      return isNaN(num) ? 0 : num;
    }
    case "checkbox":
      return (
        trimmed.toLowerCase() === "true" ||
        trimmed.toLowerCase() === "yes" ||
        trimmed === "1"
      );
    case "date": {
      // Try to extract ISO date
      const dateMatch = trimmed.match(/\d{4}-\d{2}-\d{2}/);
      return dateMatch ? dateMatch[0] : trimmed;
    }
    case "select": {
      // Validate against options if available
      if (options?.length) {
        const match = options.find(
          (o) => o.value.toLowerCase() === trimmed.toLowerCase()
        );
        return match ? match.value : options[0]?.value ?? trimmed;
      }
      return trimmed;
    }
    case "multi-select": {
      const values = trimmed.split(",").map((v) => v.trim());
      if (options?.length) {
        return values.filter((v) =>
          options.some((o) => o.value.toLowerCase() === v.toLowerCase())
        );
      }
      return values;
    }
    default:
      return trimmed;
  }
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

  try {
    const { text } = await generateText({
      model,
      prompt,
    });

    const value = parseValue(text, task.column.variant, task.column.options);

    // Stream the update for this cell
    writer.write({
      id: `cell-${task.rowIndex}-${task.columnId}`,
      type: "data-enrich-data",
      data: {
        updates: [
          {
            rowIndex: task.rowIndex,
            columnId: task.columnId,
            value,
          },
        ],
        status: "done",
      },
    });

    console.log(
      `[DataAgent] Generated value for row ${task.rowIndex}, column ${task.columnId}:`,
      value
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
