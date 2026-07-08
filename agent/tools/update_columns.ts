import { defineTool } from "eve/tools";

import { updateColumnsInputSchema } from "../../src/lib/assistant-schemas";

export default defineTool({
  description: `Use this tool to modify existing columns in the spreadsheet. This tool updates column properties like label, type, options, or prompt.

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
</example>`,
  inputSchema: updateColumnsInputSchema,
  outputSchema: updateColumnsInputSchema,
  execute: (input) => input,
  toModelOutput: (output) => ({
    type: "text",
    value: `Successfully updated ${output.updates.length} column${
      output.updates.length !== 1 ? "s" : ""
    }.`,
  }),
});
