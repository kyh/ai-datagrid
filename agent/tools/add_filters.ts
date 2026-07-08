import { defineTool } from "eve/tools";

import { addFiltersInputSchema } from "../../src/lib/assistant-schemas";

export default defineTool({
  description: `Use this tool to add filters to the spreadsheet. Filters narrow down visible rows based on column values.

## When to Use This Tool

Use Add Filters when:
1. The user wants to filter data (e.g., "show only completed tasks", "filter by status")
2. The user wants to find specific rows (e.g., "show rows where price is greater than 100")
3. The user wants to narrow down the data view

## Filter Properties

- **columnId**: (Required) The ID of the column to filter
- **operator**: (Required) The comparison operator - depends on column type:
  - **Text columns**: contains, notContains, equals, notEquals, startsWith, endsWith, isEmpty, isNotEmpty
  - **Number columns**: equals, notEquals, lessThan, lessThanOrEqual, greaterThan, greaterThanOrEqual, isBetween, isEmpty, isNotEmpty
  - **Date columns**: equals, notEquals, before, after, onOrBefore, onOrAfter, isBetween, isEmpty, isNotEmpty
  - **Select/Multi-select**: is, isNot, isAnyOf, isNoneOf, isEmpty, isNotEmpty
  - **Checkbox**: isTrue, isFalse
- **value**: (Optional) The value to compare against - not needed for isEmpty/isNotEmpty/isTrue/isFalse
- **endValue**: (Optional) End value for "isBetween" operator

## Best Practices

- Choose the appropriate operator for the column type
- For select columns, use exact option values
- Multiple filters are combined with AND logic
- Use existing column IDs from the columns list

## Examples

<example>
User: Show only completed tasks
*Uses Add Filters with:*
- columnId: "status", operator: "is", value: "completed"
</example>

<example>
User: Filter products with price greater than 100
*Uses Add Filters with:*
- columnId: "price", operator: "greaterThan", value: 100
</example>

<example>
User: Show tasks due before January 2025
*Uses Add Filters with:*
- columnId: "due-date", operator: "before", value: "2025-01-01"
</example>`,
  inputSchema: addFiltersInputSchema,
  outputSchema: addFiltersInputSchema,
  execute: (input) => input,
  toModelOutput: (output) => ({
    type: "text",
    value: `Successfully added ${output.filters.length} filter${
      output.filters.length !== 1 ? "s" : ""
    }.`,
  }),
});
