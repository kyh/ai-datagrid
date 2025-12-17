import type { UIMessage, UIMessageStreamWriter } from "ai";
import { tool } from "ai";
import { z } from "zod";
import { columnDefinitionSchema } from "../messages/data-parts";

import type { DataPart } from "../messages/data-parts";

const description = `Use this tool to generate column definitions for a spreadsheet. This tool creates the structure (columns) of a spreadsheet based on user requirements.

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

type Params = {
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>;
};

export const generateColumns = ({ writer }: Params) =>
  tool({
    description,
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
