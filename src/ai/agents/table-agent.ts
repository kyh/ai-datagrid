import {
  createGateway,
  stepCountIs,
  tool,
  ToolLoopAgent,
  type UIMessage,
  type UIMessageStreamWriter,
} from "ai";
import { z } from "zod";

import {
  columnDefinitionSchema,
  columnUpdateSchema,
  columnDeleteSchema,
  filterSchema,
  removeFiltersSchema,
  sortSchema,
  removeSortsSchema,
  type DataPart,
} from "../messages/data-parts";
import generatePrompt from "../response/stream-chat-response-prompt";

// -----------------------------------------------------------------------------
// Tool Descriptions
// -----------------------------------------------------------------------------

const generateColumnsDescription = `Use this tool to generate column definitions for a spreadsheet. This tool creates the structure (columns) of a spreadsheet based on user requirements.

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

const updateColumnsDescription = `Use this tool to modify existing columns in the spreadsheet. This tool updates column properties like label, type, options, or prompt.

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
</example>`;

const deleteColumnsDescription = `Use this tool to remove columns from the spreadsheet. This permanently deletes the specified columns and all their data.

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
</example>`;

const addFiltersDescription = `Use this tool to add filters to the spreadsheet. Filters narrow down visible rows based on column values.

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
</example>`;

const removeFiltersDescription = `Use this tool to remove filters from specific columns.

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
</example>`;

const clearFiltersDescription = `Use this tool to clear all filters from the spreadsheet.

## When to Use This Tool

Use Clear Filters when:
1. The user wants to remove all filters (e.g., "clear all filters", "show all rows")
2. The user wants to reset the view

## Examples

<example>
User: Clear all filters
*Uses Clear Filters*
</example>`;

const addSortsDescription = `Use this tool to add sorting to the spreadsheet. Sorts order rows based on column values.

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
</example>`;

const removeSortsDescription = `Use this tool to remove sorting from specific columns.

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
</example>`;

const clearSortsDescription = `Use this tool to clear all sorting from the spreadsheet.

## When to Use This Tool

Use Clear Sorts when:
1. The user wants to remove all sorting (e.g., "clear all sorts", "unsort everything")
2. The user wants to reset to the default row order

## Examples

<example>
User: Clear all sorting
*Uses Clear Sorts*
</example>`;

// -----------------------------------------------------------------------------
// Tool Definitions
// -----------------------------------------------------------------------------

type WriterParams = {
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>;
};

function createGenerateColumnsTool({ writer }: WriterParams) {
  return tool({
    description: generateColumnsDescription,
    inputSchema: z.object({
      columns: z.array(columnDefinitionSchema),
    }),
    execute: async ({ columns }, { toolCallId }) => {
      writer.write({
        id: toolCallId,
        type: "data-generate-columns",
        data: { columns, status: "done" },
      });

      return `Successfully generated ${columns.length} column${
        columns.length !== 1 ? "s" : ""
      }.`;
    },
  });
}

function createUpdateColumnsTool({ writer }: WriterParams) {
  return tool({
    description: updateColumnsDescription,
    inputSchema: z.object({
      updates: z.array(columnUpdateSchema),
    }),
    execute: async ({ updates }, { toolCallId }) => {
      writer.write({
        id: toolCallId,
        type: "data-update-columns",
        data: { updates, status: "done" },
      });

      return `Successfully updated ${updates.length} column${
        updates.length !== 1 ? "s" : ""
      }.`;
    },
  });
}

function createDeleteColumnsTool({ writer }: WriterParams) {
  return tool({
    description: deleteColumnsDescription,
    inputSchema: columnDeleteSchema,
    execute: async ({ columnIds }, { toolCallId }) => {
      writer.write({
        id: toolCallId,
        type: "data-delete-columns",
        data: { columnIds, status: "done" },
      });

      return `Successfully deleted ${columnIds.length} column${
        columnIds.length !== 1 ? "s" : ""
      }.`;
    },
  });
}

function createAddFiltersTool({ writer }: WriterParams) {
  return tool({
    description: addFiltersDescription,
    inputSchema: z.object({
      filters: z.array(filterSchema),
    }),
    execute: async ({ filters }, { toolCallId }) => {
      writer.write({
        id: toolCallId,
        type: "data-add-filters",
        data: { filters, status: "done" },
      });

      return `Successfully added ${filters.length} filter${
        filters.length !== 1 ? "s" : ""
      }.`;
    },
  });
}

function createRemoveFiltersTool({ writer }: WriterParams) {
  return tool({
    description: removeFiltersDescription,
    inputSchema: removeFiltersSchema,
    execute: async ({ columnIds }, { toolCallId }) => {
      writer.write({
        id: toolCallId,
        type: "data-remove-filters",
        data: { columnIds, status: "done" },
      });

      return `Successfully removed filters from ${columnIds.length} column${
        columnIds.length !== 1 ? "s" : ""
      }.`;
    },
  });
}

function createClearFiltersTool({ writer }: WriterParams) {
  return tool({
    description: clearFiltersDescription,
    inputSchema: z.object({}),
    execute: async (_, { toolCallId }) => {
      writer.write({
        id: toolCallId,
        type: "data-clear-filters",
        data: { status: "done" },
      });

      return "Successfully cleared all filters.";
    },
  });
}

function createAddSortsTool({ writer }: WriterParams) {
  return tool({
    description: addSortsDescription,
    inputSchema: z.object({
      sorts: z.array(sortSchema),
    }),
    execute: async ({ sorts }, { toolCallId }) => {
      writer.write({
        id: toolCallId,
        type: "data-add-sorts",
        data: { sorts, status: "done" },
      });

      return `Successfully added ${sorts.length} sort${
        sorts.length !== 1 ? "s" : ""
      }.`;
    },
  });
}

function createRemoveSortsTool({ writer }: WriterParams) {
  return tool({
    description: removeSortsDescription,
    inputSchema: removeSortsSchema,
    execute: async ({ columnIds }, { toolCallId }) => {
      writer.write({
        id: toolCallId,
        type: "data-remove-sorts",
        data: { columnIds, status: "done" },
      });

      return `Successfully removed sorting from ${columnIds.length} column${
        columnIds.length !== 1 ? "s" : ""
      }.`;
    },
  });
}

function createClearSortsTool({ writer }: WriterParams) {
  return tool({
    description: clearSortsDescription,
    inputSchema: z.object({}),
    execute: async (_, { toolCallId }) => {
      writer.write({
        id: toolCallId,
        type: "data-clear-sorts",
        data: { status: "done" },
      });

      return "Successfully cleared all sorting.";
    },
  });
}

// -----------------------------------------------------------------------------
// Agent Factory
// -----------------------------------------------------------------------------

export type ExistingColumn = {
  id: string;
  label: string;
  variant: string;
  prompt?: string;
  options?: Array<{ label: string; value: string }>;
};

export type ExistingFilter = {
  columnId: string;
  operator: string;
  value?: string | number | string[];
};

export type ExistingSort = {
  columnId: string;
  direction: "asc" | "desc";
};

type CreateTableAgentParams = {
  apiKey: string;
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>;
  existingColumns?: ExistingColumn[];
  existingFilters?: ExistingFilter[];
  existingSorts?: ExistingSort[];
};

/**
 * Builds instructions with existing columns, filters, and sorts context.
 */
function buildTableInstructions(
  existingColumns?: ExistingColumn[],
  existingFilters?: ExistingFilter[],
  existingSorts?: ExistingSort[]
): string {
  const sections: string[] = [generatePrompt];

  if (existingColumns && existingColumns.length > 0) {
    const columnList = existingColumns
      .map((c) => {
        let line = `- "${c.id}" (${c.label}, type: ${c.variant})`;
        if (c.options && c.options.length > 0) {
          const optionValues = c.options.map((o) => o.value).join(", ");
          line += `\n  Options: ${optionValues}`;
        }
        if (c.prompt) {
          line += `\n  Prompt: "${c.prompt}"`;
        }
        return line;
      })
      .join("\n");

    sections.push(`## Existing Columns

The spreadsheet has these columns:
${columnList}

When filtering, sorting, updating, or deleting columns, use the exact column IDs shown above.
When filtering select columns, use the exact option values shown above.`);
  }

  if (existingFilters && existingFilters.length > 0) {
    const filterList = existingFilters
      .map((f) => {
        let line = `- Column "${f.columnId}": ${f.operator}`;
        if (f.value !== undefined) {
          line += ` "${f.value}"`;
        }
        return line;
      })
      .join("\n");

    sections.push(`## Active Filters

The following filters are currently applied:
${filterList}

Use removeFilters or clearFilters to modify active filters.`);
  }

  if (existingSorts && existingSorts.length > 0) {
    const sortList = existingSorts
      .map((s) => `- Column "${s.columnId}": ${s.direction === "asc" ? "ascending" : "descending"}`)
      .join("\n");

    sections.push(`## Active Sorting

The following sorting is currently applied:
${sortList}

Use removeSorts or clearSorts to modify active sorting.`);
  }

  return sections.join("\n\n");
}

/**
 * Creates a table agent for column management, filtering, and sorting.
 * Handles: generate, update, delete columns; add, remove, clear filters/sorts.
 */
export function createTableAgent({
  apiKey,
  writer,
  existingColumns,
  existingFilters,
  existingSorts,
}: CreateTableAgentParams) {
  const model = createGateway({ apiKey })("openai/gpt-5.1-instant");

  const instructions = buildTableInstructions(
    existingColumns,
    existingFilters,
    existingSorts
  );

  return new ToolLoopAgent({
    model,
    instructions,
    tools: {
      generateColumns: createGenerateColumnsTool({ writer }),
      updateColumns: createUpdateColumnsTool({ writer }),
      deleteColumns: createDeleteColumnsTool({ writer }),
      addFilters: createAddFiltersTool({ writer }),
      removeFilters: createRemoveFiltersTool({ writer }),
      clearFilters: createClearFiltersTool({ writer }),
      addSorts: createAddSortsTool({ writer }),
      removeSorts: createRemoveSortsTool({ writer }),
      clearSorts: createClearSortsTool({ writer }),
    },
    stopWhen: stepCountIs(5),
    toolChoice: "auto",
  });
}
