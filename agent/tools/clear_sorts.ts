import { defineTool } from "eve/tools";

import { clearSortsInputSchema } from "../../src/lib/assistant-schemas";

export default defineTool({
  description: `Use this tool to clear all sorting from the spreadsheet.

## When to Use This Tool

Use Clear Sorts when:
1. The user wants to remove all sorting (e.g., "clear all sorts", "unsort everything")
2. The user wants to reset to the default row order

## Examples

<example>
User: Clear all sorting
*Uses Clear Sorts*
</example>`,
  inputSchema: clearSortsInputSchema,
  outputSchema: clearSortsInputSchema,
  execute: (input) => input,
  toModelOutput: () => ({
    type: "text",
    value: "Successfully cleared all sorting.",
  }),
});
