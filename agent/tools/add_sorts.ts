import { defineTool } from "eve/tools";

import { addSortsInputSchema } from "../../src/lib/assistant-schemas";

export default defineTool({
  description: `Use this tool to add sorting to the spreadsheet. Sorts order rows based on column values.

## When to Use This Tool

Use Add Sorts when:
1. The user wants to sort data (e.g., "sort by date", "order by price descending")
2. The user wants to organize the data view

## Sort Properties

- **columnId**: (Required) The ID of the column to sort by
- **direction**: (Required) Sort direction - "asc" (ascending) or "desc" (descending)

## Best Practices

- Multiple sorts create a priority order (first sort is primary, second is secondary, etc.)
- Use "asc" for A-Z, oldest-newest, lowest-highest
- Use "desc" for Z-A, newest-oldest, highest-lowest
- Use existing column IDs from the columns list

## Examples

<example>
User: Sort by date newest first
*Uses Add Sorts with:*
- columnId: "date", direction: "desc"
</example>

<example>
User: Sort by priority then by due date
*Uses Add Sorts with:*
- [{ columnId: "priority", direction: "asc" }, { columnId: "due-date", direction: "asc" }]
</example>`,
  inputSchema: addSortsInputSchema,
  outputSchema: addSortsInputSchema,
  execute: (input) => input,
  toModelOutput: (output) => ({
    type: "text",
    value: `Successfully added ${output.sorts.length} sort${output.sorts.length !== 1 ? "s" : ""}.`,
  }),
});
