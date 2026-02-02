import { createGateway, generateObject } from "ai";
import type { UIMessage, UIMessageStreamWriter } from "ai";

import type { DataPart } from "../messages/data-parts";
import type { SelectionContext, ColumnInfo } from "@/lib/selection-context";
import {
  shortTextValueSchema,
  longTextValueSchema,
  numberValueSchema,
  checkboxValueSchema,
  dateValueSchema,
  urlValueSchema,
  selectValueSchema,
  multiSelectValueSchema,
  createSelectValueSchema,
  createMultiSelectValueSchema,
} from "@/lib/data-grid-schema";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type CellTask = {
  rowIndex: number;
  columnId: string;
  column: ColumnInfo;
};

type RunDataAgentParams = {
  apiKey: string;
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
      return numberValueSchema;

    case "checkbox":
      return checkboxValueSchema;

    case "date":
      return dateValueSchema;

    case "select": {
      if (column.options?.length) {
        return createSelectValueSchema(column.options.map((o) => o.value));
      }
      return selectValueSchema;
    }

    case "multi-select": {
      if (column.options?.length) {
        return createMultiSelectValueSchema(column.options.map((o) => o.value));
      }
      return multiSelectValueSchema;
    }

    case "url":
      return urlValueSchema;

    case "long-text":
      return longTextValueSchema;

    // short-text and default
    default:
      return shortTextValueSchema;
  }
}

// -----------------------------------------------------------------------------
// Prompt Builder
// -----------------------------------------------------------------------------

type PromptContext = {
  userMessage: string;
  rowData?: Record<string, unknown>;
  allColumns: ColumnInfo[];
};

function buildCellPrompt(task: CellTask, context: PromptContext): string {
  const { column, rowIndex } = task;
  const { userMessage, rowData, allColumns } = context;

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

  // Add row context from other cells
  if (rowData && Object.keys(rowData).length > 0) {
    const otherValues: string[] = [];
    for (const col of allColumns) {
      // Skip the current column being generated
      if (col.id === column.id) continue;
      const value = rowData[col.id];
      if (value !== undefined && value !== null && value !== "") {
        otherValues.push(`${col.label}: ${JSON.stringify(value)}`);
      }
    }
    if (otherValues.length > 0) {
      prompt += `\nOther values in this row:\n${otherValues.join("\n")}\n`;
      prompt += `\nUse these values for context to generate coherent, related data.`;
    }
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
  context: PromptContext,
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>,
): Promise<void> {
  const prompt = buildCellPrompt(task, context);
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
  apiKey,
  writer,
  selectionContext,
  userMessage,
}: RunDataAgentParams): Promise<void> {
  const model = createGateway({ apiKey })("openai/gpt-5.1-instant");

  const { bounds, currentColumns, rowData } = selectionContext;

  // Build list of cell tasks from selected cells
  const tasks: CellTask[] = [];

  for (let rowIndex = bounds.minRow; rowIndex <= bounds.maxRow; rowIndex++) {
    for (const column of currentColumns) {
      // Only process cells within the selected columns
      if (bounds.columns.includes(column.id)) {
        tasks.push({
          rowIndex,
          columnId: column.id,
          column,
        });
      }
    }
  }

  console.log(
    `[DataAgent] Processing ${tasks.length} cells in batches of ${MAX_CONCURRENT_CELLS}`
  );

  // Process cells in batches of 5
  await processBatch(tasks, MAX_CONCURRENT_CELLS, (task) => {
    const context: PromptContext = {
      userMessage,
      rowData: rowData?.[task.rowIndex],
      allColumns: currentColumns,
    };
    return generateCellValue(model, task, context, writer);
  });

  console.log("[DataAgent] Completed all cell updates");
}
