import { defineTool } from "eve/tools";

import { removeSortsInputSchema } from "../../src/lib/assistant-schemas";

export default defineTool({
  description: `Use this tool to remove sorting from specific columns.

## When to Use This Tool

Use Remove Sorts when:
1. The user wants to remove a specific sort (e.g., "stop sorting by date")
2. The user wants to unsort certain columns

## Properties

- **columnIds**: Array of column IDs to remove sorting from

## Examples

<example>
User: Remove the date sort
*Uses Remove Sorts with:*
- columnIds: ["date"]
</example>`,
  inputSchema: removeSortsInputSchema,
  outputSchema: removeSortsInputSchema,
  execute: (input) => input,
  toModelOutput: (output) => ({
    type: "text",
    value: `Successfully removed sorting from ${output.columnIds.length} column${
      output.columnIds.length !== 1 ? "s" : ""
    }.`,
  }),
});
