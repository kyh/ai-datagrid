import type { UIMessage, UIMessageStreamWriter } from "ai";
import { tool } from "ai";
import { z } from "zod";
import { updateCellSchema } from "@/lib/data-grid-schema";

import type { DataPart } from "../messages/data-parts";

const description = `Use this tool to populate spreadsheet rows with data. This tool adds or updates cell values in the spreadsheet.

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

type Params = {
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>;
};

export const enrichData = ({ writer }: Params) =>
  tool({
    description,
    inputSchema: z.object({
      updates: z.array(updateCellSchema),
    }),
    execute: async ({ updates }, { toolCallId }) => {
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
      return `Successfully updated ${updates.length} cell${
        updates.length !== 1 ? "s" : ""
      } across ${uniqueRows} row${uniqueRows !== 1 ? "s" : "s"}.`;
    },
  });
