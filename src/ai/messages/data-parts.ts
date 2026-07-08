import { z } from "zod";
import { cellSelectOptionSchema, updateCellSchema } from "@/lib/data-grid-schema";

// Reusable cell variant enum
const cellVariantSchema = z.enum([
  "short-text",
  "long-text",
  "number",
  "date",
  "select",
  "multi-select",
  "checkbox",
  "url",
  "file",
]);

// Schema for column definition
// Reuses cell variant schemas from data-grid-schema
const columnDefinitionSchema = z.object({
  id: z.string(),
  label: z.string(),
  variant: cellVariantSchema,
  // Reuse cellSelectOptionSchema for options
  options: z.array(cellSelectOptionSchema).optional(),
  // Reuse number cell schema fields
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  // Optional AI prompt for enriching column data
  prompt: z.string().optional(),
});

// Schema for column updates (partial - only id required)
const columnUpdateSchema = z.object({
  columnId: z.string(),
  label: z.string().optional(),
  variant: cellVariantSchema.optional(),
  options: z.array(cellSelectOptionSchema).optional(),
  prompt: z.string().optional(),
});

// Schema for column deletion
const columnDeleteSchema = z.object({
  columnIds: z.array(z.string()),
});

// Filter operator schemas by variant type
const textFilterOperatorSchema = z.enum([
  "contains",
  "notContains",
  "equals",
  "notEquals",
  "startsWith",
  "endsWith",
  "isEmpty",
  "isNotEmpty",
]);

const numberFilterOperatorSchema = z.enum([
  "equals",
  "notEquals",
  "lessThan",
  "lessThanOrEqual",
  "greaterThan",
  "greaterThanOrEqual",
  "isBetween",
  "isEmpty",
  "isNotEmpty",
]);

const dateFilterOperatorSchema = z.enum([
  "equals",
  "notEquals",
  "before",
  "after",
  "onOrBefore",
  "onOrAfter",
  "isBetween",
  "isEmpty",
  "isNotEmpty",
]);

const selectFilterOperatorSchema = z.enum([
  "is",
  "isNot",
  "isAnyOf",
  "isNoneOf",
  "isEmpty",
  "isNotEmpty",
]);

const booleanFilterOperatorSchema = z.enum(["isTrue", "isFalse"]);

// Combined filter operator schema
const filterOperatorSchema = z.union([
  textFilterOperatorSchema,
  numberFilterOperatorSchema,
  dateFilterOperatorSchema,
  selectFilterOperatorSchema,
  booleanFilterOperatorSchema,
]);

// Helper to clean malformed string values from LLM (e.g., "Engineering},{" -> "Engineering")
const cleanStringValue = z.string().transform((val) => val.replace(/[,{}[\]]+$/, "").trim());

// Schema for filter value that cleans up malformed strings
const filterValueSchema = z.union([cleanStringValue, z.number(), z.array(cleanStringValue)]);

// Schema for a filter definition
const filterSchema = z.object({
  columnId: z.string(),
  operator: filterOperatorSchema,
  value: filterValueSchema.optional(),
  endValue: z.union([cleanStringValue, z.number()]).optional(),
});

// Schema for removing filters
const removeFiltersSchema = z.object({
  columnIds: z.array(z.string()),
});

// Schema for a sort definition
const sortSchema = z.object({
  columnId: z.string(),
  direction: z.enum(["asc", "desc"]),
});

// Schema for removing sorts
const removeSortsSchema = z.object({
  columnIds: z.array(z.string()),
});

// Type for column update
export type ColumnUpdate = z.infer<typeof columnUpdateSchema>;

// Schema for a single failed enrichment cell
const enrichFailureSchema = z.object({
  rowIndex: z.number(),
  columnId: z.string(),
});

/**
 * Zod schemas for every data part streamed from server to client.
 * The wire type carries a "data-" prefix (e.g. "data-generate-columns");
 * these map keys do not. The client's `onData` parses each payload with the
 * matching schema before mutating state — no casts.
 */
export const dataPartSchemas = {
  "generate-columns": z.object({
    columns: z.array(columnDefinitionSchema),
    status: z.literal("done"),
  }),
  "update-columns": z.object({
    updates: z.array(columnUpdateSchema),
    status: z.literal("done"),
  }),
  "delete-columns": z.object({
    columnIds: z.array(z.string()),
    status: z.literal("done"),
  }),
  "enrich-data": z.object({
    updates: z.array(updateCellSchema),
    status: z.literal("done"),
  }),
  "enrich-errors": z.object({
    failures: z.array(enrichFailureSchema),
    status: z.literal("done"),
  }),
  "add-filters": z.object({
    filters: z.array(filterSchema),
    status: z.literal("done"),
  }),
  "remove-filters": z.object({
    columnIds: z.array(z.string()),
    status: z.literal("done"),
  }),
  "clear-filters": z.object({
    status: z.literal("done"),
  }),
  "add-sorts": z.object({
    sorts: z.array(sortSchema),
    status: z.literal("done"),
  }),
  "remove-sorts": z.object({
    columnIds: z.array(z.string()),
    status: z.literal("done"),
  }),
  "clear-sorts": z.object({
    status: z.literal("done"),
  }),
};

// DataPart maps data type names to their value types, derived from the schemas.
// Used as the generic parameter for UIMessageStreamWriter and useChat.
// The AI SDK uses this to provide proper type narrowing in onData callback.
export type DataPart = {
  [K in keyof typeof dataPartSchemas]: z.infer<(typeof dataPartSchemas)[K]>;
};

// Export schemas for use in tools
export {
  columnDefinitionSchema,
  columnUpdateSchema,
  columnDeleteSchema,
  filterSchema,
  removeFiltersSchema,
  sortSchema,
  removeSortsSchema,
};
