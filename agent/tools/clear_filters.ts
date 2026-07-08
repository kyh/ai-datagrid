import { defineTool } from "eve/tools";

import { clearFiltersInputSchema } from "../../src/lib/assistant-schemas";

export default defineTool({
  description: `Use this tool to clear all filters from the spreadsheet.

## When to Use This Tool

Use Clear Filters when:
1. The user wants to remove all filters (e.g., "clear all filters", "show all rows")
2. The user wants to reset the view

## Examples

<example>
User: Clear all filters
*Uses Clear Filters*
</example>`,
  inputSchema: clearFiltersInputSchema,
  outputSchema: clearFiltersInputSchema,
  execute: (input) => input,
  toModelOutput: () => ({
    type: "text",
    value: "Successfully cleared all filters.",
  }),
});
