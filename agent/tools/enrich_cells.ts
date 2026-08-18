import { generateObject } from "ai";
import { defineTool } from "eve/tools";
import { z } from "zod";

// Relative imports: agent/ is compiled by eve, which resolves plain relative
// paths but not tsconfig `@/*` aliases.
import { enrichCellsInputSchema, enrichCellsPayloadSchema } from "../../src/lib/assistant-schemas";
import {
  checkboxValueSchema,
  createMultiSelectValueSchema,
  createSelectValueSchema,
  dateValueSchema,
  longTextValueSchema,
  multiSelectValueSchema,
  numberValueSchema,
  selectValueSchema,
  shortTextValueSchema,
  urlValueSchema,
} from "../../src/lib/data-grid-schema";
import { createModel } from "../../src/lib/gateway";
import type { ColumnInfo } from "../../src/lib/selection-context";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type EnrichCellsInput = z.infer<typeof enrichCellsInputSchema>;
type EnrichCellsPayload = z.infer<typeof enrichCellsPayloadSchema>;

type EnrichCellsRow = EnrichCellsInput["rows"][number];

type CellTask = {
  rowIndex: number;
  columnId: string;
  column: ColumnInfo;
  rowData?: EnrichCellsRow["rowData"];
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

function buildCellPrompt(task: CellTask, userMessage: string, allColumns: ColumnInfo[]): string {
  const { column, rowIndex, rowData } = task;

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

  // Add row context from other cells (labels resolve through the enriched
  // columns; values from unselected columns fall back to their column id).
  if (rowData && Object.keys(rowData).length > 0) {
    const labelById = new Map(allColumns.map((c) => [c.id, c.label]));
    const otherValues: string[] = [];
    for (const [columnId, value] of Object.entries(rowData)) {
      // Skip the current column being generated
      if (columnId === column.id) continue;
      if (value !== undefined && value !== null && value !== "") {
        otherValues.push(`${labelById.get(columnId) ?? columnId}: ${JSON.stringify(value)}`);
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
// Batch Processor
// -----------------------------------------------------------------------------

async function processBatch<T>(
  items: T[],
  batchSize: number,
  processor: (item: T) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(processor));
  }
}

const MAX_CONCURRENT_CELLS = 5;

// -----------------------------------------------------------------------------
// Enrichment
// -----------------------------------------------------------------------------

async function enrichCells(
  input: EnrichCellsInput,
  gatewayApiKey: string | undefined,
  abortSignal: AbortSignal,
): Promise<EnrichCellsPayload> {
  const model = createModel(gatewayApiKey);

  // Build one task per (row, column) pair
  const tasks: CellTask[] = [];
  for (const row of input.rows) {
    for (const column of input.columns) {
      tasks.push({
        rowIndex: row.rowIndex,
        columnId: column.id,
        column,
        ...(row.rowData !== undefined ? { rowData: row.rowData } : undefined),
      });
    }
  }

  // Process cells in batches of 5, collecting per-cell results and failures
  const updates: EnrichCellsPayload["updates"] = [];
  const failures: EnrichCellsPayload["failures"] = [];

  await processBatch(tasks, MAX_CONCURRENT_CELLS, async (task) => {
    const prompt = buildCellPrompt(task, input.context, input.columns);
    const schema = buildCellSchema(task.column);

    try {
      const { object } = await generateObject({ model, prompt, schema, abortSignal });
      updates.push({
        rowIndex: task.rowIndex,
        columnId: task.columnId,
        value: object.value,
      });
    } catch {
      // Record the failure so it can be surfaced to the client;
      // other cells continue processing.
      failures.push({ rowIndex: task.rowIndex, columnId: task.columnId });
    }
  });

  return { updates, failures };
}

// -----------------------------------------------------------------------------
// Tool
// -----------------------------------------------------------------------------

export default defineTool({
  description: `Use this tool to populate the SELECTED spreadsheet cells with AI-generated values (enrichment).

## When to Use This Tool

Use Enrich Cells when:
1. The per-turn context has a non-null \`selection\` and the user asks to enrich, fill, populate, or generate values (the composer's default message is "Enrich selected cells")
2. The user wants realistic sample data in the cells they selected

## How to Call It

Copy the selection out of the per-turn context — do not invent rows or columns:
- **context**: A short restatement of the user's request, used as generation context for every cell
- **columns**: The entries from \`selection.currentColumns\` whose id appears in \`selection.bounds.columns\`, copied verbatim (id, label, variant, options, prompt)
- **rows**: One entry per row index from \`selection.bounds.minRow\` to \`selection.bounds.maxRow\`, each carrying \`selection.rowData[rowIndex]\` as \`rowData\` when present

## Behavior

Each cell is generated individually (respecting the column's type, options, and prompt, using the row's other values for coherence) and the full batch of updates is returned at once. Failed cells are reported in \`failures\`.`,
  inputSchema: enrichCellsInputSchema,
  outputSchema: enrichCellsPayloadSchema,
  execute: (input, ctx) => {
    // Same BYO-key mechanism as the agent's dynamic model resolver: the
    // channel verifier stashed the caller's gateway key in session auth.
    const auth = ctx.session.auth.current ?? ctx.session.auth.initiator;
    const attribute = z.string().min(1).safeParse(auth?.attributes["gatewayApiKey"]);
    const gatewayApiKey = attribute.success ? attribute.data : undefined;
    return enrichCells(input, gatewayApiKey, ctx.abortSignal);
  },
  toModelOutput: (output) => ({
    type: "text",
    value: `Successfully enriched ${output.updates.length} cell${
      output.updates.length !== 1 ? "s" : ""
    }${output.failures.length > 0 ? ` (${output.failures.length} failed)` : ""}.`,
  }),
});
