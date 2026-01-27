import {
  createGateway,
  InferUITools,
  stepCountIs,
  tool,
  ToolLoopAgent,
  type UIMessage,
  type UIMessageStreamWriter,
} from "ai";
import { z } from "zod";

import { columnDefinitionSchema, type DataPart } from "./messages/data-parts";
import type { Metadata } from "./messages/metadata";
import { updateCellSchema } from "@/lib/data-grid-schema";
import type { SelectionContext } from "@/lib/selection-context";
import generatePrompt from "./response/stream-chat-response-prompt";

// -----------------------------------------------------------------------------
// Tool Descriptions
// -----------------------------------------------------------------------------

const generateColumnsDescription = `Use this tool to generate column definitions for a spreadsheet. This tool creates the structure (columns) of a spreadsheet based on user requirements.

## When to Use This Tool

Use Generate Columns when:
1. The user wants to create a new spreadsheet structure (e.g., "create a sales tracker", "make a project management sheet")
2. The user asks to add columns to an existing spreadsheet
3. The user wants to set up a spreadsheet for a specific purpose

## Column Properties

- **id**: Unique identifier for the column (use kebab-case, e.g., "product-name", "sales-date")
- **label**: Display name shown in the header (e.g., "Product Name", "Sales Date")
- **variant**: Cell type that determines how data is displayed and edited:
  - **short-text**: Short text input (names, titles, descriptions)
  - **long-text**: Multi-line text (notes, descriptions, comments)
  - **number**: Numeric values (prices, quantities, scores)
  - **date**: Date values (deadlines, start dates, birthdays)
  - **select**: Single selection from options (status, category, priority)
  - **multi-select**: Multiple selections from options (tags, skills, categories)
  - **checkbox**: Boolean true/false (completed, active, verified)
  - **url**: Web URLs (websites, links, resources)
  - **file**: File attachments (documents, images, files)
- **options**: Array of {label, value} objects for select and multi-select variants
- **min, max, step**: Optional constraints for number variant

## Intelligent Column Type Inference

When generating columns, intelligently infer the appropriate variant based on:
- Column name/context (e.g., "email" → url, "age" → number, "status" → select)
- User's description of the spreadsheet purpose
- Common patterns (e.g., "completed" → checkbox, "tags" → multi-select)

## Best Practices

- Use descriptive, user-friendly labels
- Choose appropriate variants based on the data type
- For select/multi-select, provide meaningful options
- Use kebab-case for IDs, Title Case for labels
- Consider the user's intent when inferring column types

## Examples

<example>
User: Create a sales tracker spreadsheet
Assistant: I'll create a sales tracker with columns for tracking sales data.
*Uses Generate Columns with:*
- id: "date", label: "Date", variant: "date"
- id: "product", label: "Product", variant: "short-text"
- id: "quantity", label: "Quantity", variant: "number"
- id: "price", label: "Price", variant: "number"
- id: "total", label: "Total", variant: "number"
- id: "salesperson", label: "Salesperson", variant: "short-text"
- id: "status", label: "Status", variant: "select", options: [{label: "Pending", value: "pending"}, {label: "Completed", value: "completed"}, {label: "Cancelled", value: "cancelled"}]
</example>

<example>
User: Add columns for a project management sheet
Assistant: I'll add project management columns to track tasks and progress.
*Uses Generate Columns with:*
- id: "task-name", label: "Task Name", variant: "short-text"
- id: "description", label: "Description", variant: "long-text"
- id: "assignee", label: "Assignee", variant: "short-text"
- id: "priority", label: "Priority", variant: "select", options: [{label: "High", value: "high"}, {label: "Medium", value: "medium"}, {label: "Low", value: "low"}]
- id: "due-date", label: "Due Date", variant: "date"
- id: "completed", label: "Completed", variant: "checkbox"
- id: "tags", label: "Tags", variant: "multi-select", options: [{label: "Frontend", value: "frontend"}, {label: "Backend", value: "backend"}, {label: "Design", value: "design"}]
</example>

## Summary

Use Generate Columns to create the structure of a spreadsheet. Intelligently infer column types based on context and user intent.`;

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
// Tool Definitions
// -----------------------------------------------------------------------------

type WriterParams = {
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>;
};

function createGenerateColumnsTool({ writer }: WriterParams) {
  return tool({
    description: generateColumnsDescription,
    inputSchema: z.object({
      columns: z.array(columnDefinitionSchema),
    }),
    execute: async ({ columns }, { toolCallId }) => {
      writer.write({
        id: toolCallId,
        type: "data-generate-columns",
        data: {
          "generate-columns": {
            columns,
            status: "done",
          },
        } as any,
      });

      return `Successfully generated ${columns.length} column${
        columns.length !== 1 ? "s" : ""
      }.`;
    },
  });
}

function createEnrichDataTool({ writer }: WriterParams) {
  return tool({
    description: enrichDataDescription,
    inputSchema: z.object({
      updates: z.array(updateCellSchema),
    }),
    execute: async ({ updates }, { toolCallId }) => {
      console.log("[EnrichDataTool] Called with updates:", JSON.stringify(updates, null, 2));

      writer.write({
        id: toolCallId,
        type: "data-enrich-data",
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

function createTools({ writer }: WriterParams) {
  return {
    generateColumns: createGenerateColumnsTool({ writer }),
    enrichData: createEnrichDataTool({ writer }),
  };
}

// -----------------------------------------------------------------------------
// Agent Types
// -----------------------------------------------------------------------------

export type GenerateToolSet = InferUITools<ReturnType<typeof createTools>>;

export type SpreadsheetAgentUIMessage = UIMessage<
  Metadata,
  DataPart,
  GenerateToolSet
>;

// -----------------------------------------------------------------------------
// Agent Factory
// -----------------------------------------------------------------------------

type CreateAgentParams = {
  gatewayApiKey: string;
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>;
  selectionContext: SelectionContext | null;
};

/**
 * Builds focused enrich instructions for the enrich agent.
 * This prompt emphasizes exact column ID usage and includes column prompts.
 */
function buildEnrichInstructions(selectionContext: SelectionContext): string {
  console.log("[buildEnrichInstructions] Building instructions for:", JSON.stringify(selectionContext, null, 2));
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

  console.log("[buildEnrichInstructions] Final instructions:\n", instructions);
  return instructions;
}

/**
 * Creates a generate-only agent for column creation.
 * Used when no selection context exists (generate flow).
 */
export function createGenerateAgent({
  gatewayApiKey,
  writer,
}: Omit<CreateAgentParams, "selectionContext">) {
  const model = createGateway({
    apiKey:
      gatewayApiKey === process.env.SECRET_KEY
        ? process.env.AI_GATEWAY_API_KEY
        : gatewayApiKey,
  })("openai/gpt-5.1-instant");

  return new ToolLoopAgent({
    model,
    instructions: generatePrompt,
    tools: { generateColumns: createGenerateColumnsTool({ writer }) },
    stopWhen: stepCountIs(5),
    toolChoice: "auto",
  });
}

/**
 * Creates an enrich-only agent for data population.
 * Used when selection context exists (enrich flow).
 * Has focused instructions with exact column IDs and prompts.
 */
export function createEnrichAgent({
  gatewayApiKey,
  writer,
  selectionContext,
}: CreateAgentParams & { selectionContext: SelectionContext }) {
  const model = createGateway({
    apiKey:
      gatewayApiKey === process.env.SECRET_KEY
        ? process.env.AI_GATEWAY_API_KEY
        : gatewayApiKey,
  })("openai/gpt-5.1-instant");

  const instructions = buildEnrichInstructions(selectionContext);

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

