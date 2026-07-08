import { defineTool } from "eve/tools";

import { removeFiltersInputSchema } from "../../src/lib/assistant-schemas";

export default defineTool({
  description: `Use this tool to remove filters from specific columns.

## When to Use This Tool

Use Remove Filters when:
1. The user wants to remove a specific filter (e.g., "remove the status filter")
2. The user wants to stop filtering by certain columns

## Properties

- **columnIds**: Array of column IDs to remove filters from

## Examples

<example>
User: Remove the status filter
*Uses Remove Filters with:*
- columnIds: ["status"]
</example>`,
  inputSchema: removeFiltersInputSchema,
  outputSchema: removeFiltersInputSchema,
  execute: (input) => input,
  toModelOutput: (output) => ({
    type: "text",
    value: `Successfully removed filters from ${output.columnIds.length} column${
      output.columnIds.length !== 1 ? "s" : ""
    }.`,
  }),
});
