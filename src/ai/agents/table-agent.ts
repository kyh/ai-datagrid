import {
  createGateway,
  stepCountIs,
  tool,
  ToolLoopAgent,
  type UIMessage,
  type UIMessageStreamWriter,
} from "ai";
import { z } from "zod";

import {
  columnDefinitionSchema,
  columnUpdateSchema,
  columnDeleteSchema,
  type DataPart,
} from "../messages/data-parts";
import generatePrompt from "../response/stream-chat-response-prompt";

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

const updateColumnsDescription = `Use this tool to modify existing columns in the spreadsheet. This tool updates column properties like label, type, options, or prompt.

## When to Use This Tool

Use Update Columns when:
1. The user wants to rename a column (e.g., "rename Status to Progress")
2. The user wants to change a column's type (e.g., "make Priority a select field")
3. The user wants to modify select/multi-select options
4. The user wants to update or add a column prompt

## Update Properties

- **columnId**: (Required) The ID of the column to update
- **label**: (Optional) New display name for the column
- **variant**: (Optional) New cell type for the column
- **options**: (Optional) New options array for select/multi-select (replaces existing)
- **prompt**: (Optional) New AI prompt for the column

## Best Practices

- Only include properties that need to change
- When changing variant to select/multi-select, include appropriate options
- Use exact column IDs from the existing columns list

## Examples

<example>
User: Rename the Status column to Progress
*Uses Update Columns with:*
- columnId: "status", label: "Progress"
</example>

<example>
User: Change Priority to have options Critical, High, Medium, Low
*Uses Update Columns with:*
- columnId: "priority", variant: "select", options: [{label: "Critical", value: "critical"}, {label: "High", value: "high"}, {label: "Medium", value: "medium"}, {label: "Low", value: "low"}]
</example>`;

const deleteColumnsDescription = `Use this tool to remove columns from the spreadsheet. This permanently deletes the specified columns and all their data.

## When to Use This Tool

Use Delete Columns ONLY when:
1. The user explicitly requests column deletion (e.g., "delete the Notes column", "remove Priority")
2. The user wants to clean up unused columns

## IMPORTANT

- Only delete columns when the user explicitly asks
- This action is destructive and cannot be undone
- Column IDs must match existing columns exactly

## Properties

- **columnIds**: Array of column IDs to delete

## Examples

<example>
User: Delete the Notes column
*Uses Delete Columns with:*
- columnIds: ["notes"]
</example>

<example>
User: Remove the Description and Comments columns
*Uses Delete Columns with:*
- columnIds: ["description", "comments"]
</example>`;

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
        data: { columns, status: "done" },
      });

      return `Successfully generated ${columns.length} column${
        columns.length !== 1 ? "s" : ""
      }.`;
    },
  });
}

function createUpdateColumnsTool({ writer }: WriterParams) {
  return tool({
    description: updateColumnsDescription,
    inputSchema: z.object({
      updates: z.array(columnUpdateSchema),
    }),
    execute: async ({ updates }, { toolCallId }) => {
      writer.write({
        id: toolCallId,
        type: "data-update-columns",
        data: { updates, status: "done" },
      });

      return `Successfully updated ${updates.length} column${
        updates.length !== 1 ? "s" : ""
      }.`;
    },
  });
}

function createDeleteColumnsTool({ writer }: WriterParams) {
  return tool({
    description: deleteColumnsDescription,
    inputSchema: columnDeleteSchema,
    execute: async ({ columnIds }, { toolCallId }) => {
      writer.write({
        id: toolCallId,
        type: "data-delete-columns",
        data: { columnIds, status: "done" },
      });

      return `Successfully deleted ${columnIds.length} column${
        columnIds.length !== 1 ? "s" : ""
      }.`;
    },
  });
}

// -----------------------------------------------------------------------------
// Agent Factory
// -----------------------------------------------------------------------------

export type ExistingColumn = {
  id: string;
  label: string;
  prompt?: string;
};

type CreateTableAgentParams = {
  gatewayApiKey: string;
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>;
  existingColumns?: ExistingColumn[];
};

/**
 * Builds instructions with existing columns context.
 */
function buildTableInstructions(existingColumns?: ExistingColumn[]): string {
  if (!existingColumns || existingColumns.length === 0) {
    return generatePrompt;
  }

  const columnList = existingColumns
    .map((c) => {
      let line = `- "${c.id}" (${c.label})`;
      if (c.prompt) {
        line += `\n  Prompt: "${c.prompt}"`;
      }
      return line;
    })
    .join("\n");

  return `${generatePrompt}

## Existing Columns

The spreadsheet already has these columns:
${columnList}

When updating or deleting columns, use the exact column IDs shown above.`;
}

/**
 * Creates a table agent for column management.
 * Handles: generate, update, delete columns.
 */
export function createTableAgent({
  gatewayApiKey,
  writer,
  existingColumns,
}: CreateTableAgentParams) {
  const model = createGateway({
    apiKey:
      gatewayApiKey === process.env.SECRET_KEY
        ? process.env.AI_GATEWAY_API_KEY
        : gatewayApiKey,
  })("openai/gpt-5.1-instant");

  const instructions = buildTableInstructions(existingColumns);

  return new ToolLoopAgent({
    model,
    instructions,
    tools: {
      generateColumns: createGenerateColumnsTool({ writer }),
      updateColumns: createUpdateColumnsTool({ writer }),
      deleteColumns: createDeleteColumnsTool({ writer }),
    },
    stopWhen: stepCountIs(5),
    toolChoice: "auto",
  });
}
