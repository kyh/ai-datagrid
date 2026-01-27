import {
  createGateway,
  stepCountIs,
  tool,
  ToolLoopAgent,
  type UIMessage,
  type UIMessageStreamWriter,
} from "ai";
import { z } from "zod";

import { type DataPart } from "../messages/data-parts";
import { updateCellSchema } from "@/lib/data-grid-schema";
import type { SelectionContext } from "@/lib/selection-context";

// -----------------------------------------------------------------------------
// Tool Description
// -----------------------------------------------------------------------------

const enrichDataDescription = `Use this tool to populate spreadsheet rows with data. This tool adds or updates cell values in the spreadsheet.

## When to Use This Tool

Use Enrich Data when:
1. The user wants to add data to the spreadsheet (e.g., "add 10 customers", "populate with sample data")
2. The user wants to fill in rows with specific information
3. The user asks to generate data for existing columns
4. The user wants to update existing cell values

## Cell Update Properties

- **rowIndex**: Zero-based index of the target row (0 = first row, 1 = second row, etc.)
- **columnId**: The ID of the column to update (must match an existing column ID)
- **value**: The cell value, typed appropriately based on the column variant:
  - **short-text/long-text**: String
  - **number**: Number
  - **date**: Date string (ISO format) or Date object
  - **select**: String (must match one of the column's option values)
  - **multi-select**: Array of strings (each must match column's option values)
  - **checkbox**: Boolean
  - **url**: String (valid URL)
  - **file**: Array of file objects (if applicable)

## Best Practices

- Batch updates efficiently - group all updates for a row together
- Ensure values match the column variant type
- For select/multi-select, use exact option values
- For dates, use ISO format strings (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
- Generate realistic, varied data when populating multiple rows
- Respect existing data - don't overwrite unless explicitly requested

## Examples

<example>
User: Add 5 sample customers
Assistant: I'll add 5 sample customer records to the spreadsheet.
*Uses Enrich Data with:*
- rowIndex: 0, columnId: "name", value: "John Doe"
- rowIndex: 0, columnId: "email", value: "john@example.com"
- rowIndex: 0, columnId: "age", value: 32
- rowIndex: 1, columnId: "name", value: "Jane Smith"
- rowIndex: 1, columnId: "email", value: "jane@example.com"
- rowIndex: 1, columnId: "age", value: 28
... (continues for 5 rows)
</example>

<example>
User: Fill in the sales data for last month
Assistant: I'll populate the sales data with realistic values for last month.
*Uses Enrich Data with:*
- rowIndex: 0, columnId: "date", value: "2024-01-15"
- rowIndex: 0, columnId: "product", value: "Widget A"
- rowIndex: 0, columnId: "quantity", value: 10
- rowIndex: 0, columnId: "price", value: 29.99
- rowIndex: 0, columnId: "status", value: "completed"
... (continues for multiple rows)
</example>

## Summary

Use Enrich Data to populate spreadsheet cells with values. Ensure values are properly typed according to each column's variant. Batch updates efficiently for better performance.`;

// -----------------------------------------------------------------------------
// Tool Definition
// -----------------------------------------------------------------------------

type WriterParams = {
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>;
};

function createEnrichDataTool({ writer }: WriterParams) {
  return tool({
    description: enrichDataDescription,
    inputSchema: z.object({
      updates: z.array(updateCellSchema),
    }),
    execute: async ({ updates }, { toolCallId }) => {
      console.log(
        "[EnrichDataTool] Called with updates:",
        JSON.stringify(updates, null, 2),
      );

      writer.write({
        id: toolCallId,
        type: "data-enrich-data",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- AI SDK data part typing limitation
        data: {
          "enrich-data": {
            updates,
            status: "done",
          },
        } as any,
      });

      const uniqueRows = new Set(updates.map((u) => u.rowIndex)).size;
      const result = `Successfully updated ${updates.length} cell${
        updates.length !== 1 ? "s" : ""
      } across ${uniqueRows} row${uniqueRows !== 1 ? "s" : "s"}.`;
      console.log("[EnrichDataTool] Result:", result);
      return result;
    },
  });
}

// -----------------------------------------------------------------------------
// Agent Factory
// -----------------------------------------------------------------------------

type CreateDataAgentParams = {
  gatewayApiKey: string;
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>;
  selectionContext: SelectionContext;
};

/**
 * Builds focused enrich instructions for the data agent.
 * Emphasizes exact column ID usage and includes column prompts.
 */
function buildDataInstructions(selectionContext: SelectionContext): string {
  console.log(
    "[buildDataInstructions] Building instructions for:",
    JSON.stringify(selectionContext, null, 2),
  );
  const { bounds, currentColumns } = selectionContext;

  const columnDetails = currentColumns
    .map((c) => {
      let detail = `- Column ID: "${c.id}" | Label: "${c.label}" | Type: ${c.variant}`;
      if (c.prompt) {
        detail += `\n  INSTRUCTIONS: "${c.prompt}"`;
      }
      return detail;
    })
    .join("\n");

  const exactIds = currentColumns.map((c) => `"${c.id}"`).join(", ");

  const instructions = `You are a data enrichment assistant. Your ONLY job is to populate cells with data using the enrichData tool.

## CRITICAL: Use EXACT Column IDs
The column IDs below are case-sensitive. You MUST use them EXACTLY as shown.
DO NOT use column labels as IDs. DO NOT modify or kebab-case the IDs.

## Selected Region
- Rows: ${bounds.minRow} to ${bounds.maxRow} (${bounds.maxRow - bounds.minRow + 1} row${bounds.maxRow - bounds.minRow + 1 !== 1 ? "s" : ""})
- Column IDs to use: [${exactIds}]

## Columns to Populate
${columnDetails}

## STRICT RULES
1. Use ONLY these exact column IDs: [${exactIds}]
2. Update ONLY rows ${bounds.minRow} to ${bounds.maxRow}
3. Follow column INSTRUCTIONS (if provided) to generate appropriate values
4. Generate realistic, meaningful data - NEVER return empty strings
5. Call enrichData tool ONCE PER CELL - each call should update exactly ONE cell
6. Stop after all cells are updated

## Example Call
If column ID is "A" (not "name"), you MUST use:
{ "rowIndex": 0, "columnId": "A", "value": "John Doe" }
NOT:
{ "rowIndex": 0, "columnId": "name", "value": "John Doe" }`;

  console.log("[buildDataInstructions] Final instructions:\n", instructions);
  return instructions;
}

/**
 * Creates a data agent for cell enrichment.
 * Handles: populating cells with data based on selection context.
 */
export function createDataAgent({
  gatewayApiKey,
  writer,
  selectionContext,
}: CreateDataAgentParams) {
  const model = createGateway({
    apiKey:
      gatewayApiKey === process.env.SECRET_KEY
        ? process.env.AI_GATEWAY_API_KEY
        : gatewayApiKey,
  })("openai/gpt-5.1-instant");

  const instructions = buildDataInstructions(selectionContext);

  // Calculate max steps: one per cell + buffer for completion
  const { bounds } = selectionContext;
  const numRows = bounds.maxRow - bounds.minRow + 1;
  const numCols = bounds.columns.length;
  const maxSteps = numRows * numCols + 2;

  return new ToolLoopAgent({
    model,
    instructions,
    tools: { enrichData: createEnrichDataTool({ writer }) },
    stopWhen: stepCountIs(maxSteps),
    toolChoice: "auto",
  });
}
