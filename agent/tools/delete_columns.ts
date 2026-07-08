import { defineTool } from "eve/tools";

import { deleteColumnsInputSchema } from "../../src/lib/assistant-schemas";

export default defineTool({
  description: `Use this tool to remove columns from the spreadsheet. This permanently deletes the specified columns and all their data.

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
</example>`,
  inputSchema: deleteColumnsInputSchema,
  outputSchema: deleteColumnsInputSchema,
  execute: (input) => input,
  toModelOutput: (output) => ({
    type: "text",
    value: `Successfully deleted ${output.columnIds.length} column${
      output.columnIds.length !== 1 ? "s" : ""
    }.`,
  }),
});
