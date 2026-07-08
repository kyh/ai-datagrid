import { z } from "zod";

// Relative (not `@/`) imports so eve's compiler can bundle this module for
// agent tools — eve does not read tsconfig path aliases.
import { cellSelectOptionSchema, updateCellSchema } from "./data-grid-schema";
import { columnInfoSchema } from "./selection-context";

// -----------------------------------------------------------------------------
// Column / filter / sort building blocks (the model-facing zod contract)
// -----------------------------------------------------------------------------

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
export const columnDefinitionSchema = z.object({
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
export const columnUpdateSchema = z.object({
  columnId: z.string(),
  label: z.string().optional(),
  variant: cellVariantSchema.optional(),
  options: z.array(cellSelectOptionSchema).optional(),
  prompt: z.string().optional(),
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

/**
 * Filter definition as the CLIENT parses it: applies the cleaning
 * transforms before the values reach the grid (the old `onData`
 * discipline). Do NOT use in tool schemas — zod transforms cannot be
 * represented in the JSON Schema eve derives for the model.
 */
export const filterSchema = z.object({
  columnId: z.string(),
  operator: filterOperatorSchema,
  value: filterValueSchema.optional(),
  endValue: z.union([cleanStringValue, z.number()]).optional(),
});

/** Filter definition on the wire (tool input/output): transform-free. */
const filterWireSchema = z.object({
  columnId: z.string(),
  operator: filterOperatorSchema,
  value: z.union([z.string(), z.number(), z.array(z.string())]).optional(),
  endValue: z.union([z.string(), z.number()]).optional(),
});

// Schema for a sort definition
export const sortSchema = z.object({
  columnId: z.string(),
  direction: z.enum(["asc", "desc"]),
});

// Type for column update
export type ColumnUpdate = z.infer<typeof columnUpdateSchema>;

// Schema for a single failed enrichment cell
const enrichFailureSchema = z.object({
  rowIndex: z.number(),
  columnId: z.string(),
});

// -----------------------------------------------------------------------------
// Tool input schemas
//
// One schema per agent tool (agent/tools/<name>.ts). These double as the
// tool payload (output) schemas: table tools are stateless echoes — the
// client owns the grid and applies the structured result it receives via
// `action.result` stream events, zod-parsed against these same schemas.
// -----------------------------------------------------------------------------

export const generateColumnsInputSchema = z.object({
  columns: z.array(columnDefinitionSchema),
});

export const updateColumnsInputSchema = z.object({
  updates: z.array(columnUpdateSchema),
});

export const deleteColumnsInputSchema = z.object({
  columnIds: z.array(z.string()),
});

export const addFiltersInputSchema = z.object({
  filters: z.array(filterWireSchema),
});

/** Client-side parse of the add_filters payload: applies value cleaning. */
export const addFiltersPayloadSchema = z.object({
  filters: z.array(filterSchema),
});

export const removeFiltersInputSchema = z.object({
  columnIds: z.array(z.string()),
});

export const clearFiltersInputSchema = z.object({});

export const addSortsInputSchema = z.object({
  sorts: z.array(sortSchema),
});

export const removeSortsInputSchema = z.object({
  columnIds: z.array(z.string()),
});

export const clearSortsInputSchema = z.object({});

/**
 * `enrich_cells` input: the model copies the selection out of the per-turn
 * client context. The tool itself is stateless — everything it needs to
 * generate cell values (column types, options, prompts, neighboring row
 * values) must arrive through this input.
 */
export const enrichCellsInputSchema = z.object({
  context: z
    .string()
    .describe(
      "The user's request or intent, used as generation context for every cell (e.g. 'Fill in realistic contact info')",
    ),
  columns: z
    .array(columnInfoSchema)
    .describe(
      "Columns to fill. Copy the matching entries from the per-turn context's selection.currentColumns verbatim — id, label, variant, options, prompt — for every column id in selection.bounds.columns.",
    ),
  rows: z
    .array(
      z.object({
        rowIndex: z
          .number()
          .describe("Zero-based row index from selection.bounds (minRow..maxRow)"),
        rowData: z
          .record(z.string(), z.unknown())
          .optional()
          .describe(
            "Existing values in this row keyed by column id — copy selection.rowData[rowIndex] verbatim when present",
          ),
      }),
    )
    .describe("Rows to fill, one entry per selected row"),
});

/**
 * `enrich_cells` output: generated cell values plus the cells that failed,
 * returned in one batch when the whole fan-out completes.
 */
export const enrichCellsPayloadSchema = z.object({
  updates: z.array(updateCellSchema),
  failures: z.array(enrichFailureSchema),
});

// -----------------------------------------------------------------------------
// Client-context (per-turn grid state) schemas
// -----------------------------------------------------------------------------

export const existingColumnSchema = z.object({
  id: z.string(),
  label: z.string(),
  variant: z.string(),
  prompt: z.string().optional(),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
});

export const existingFilterSchema = z.object({
  columnId: z.string(),
  operator: z.string(),
  value: z.union([z.string(), z.number(), z.array(z.string())]).optional(),
});

export const existingSortSchema = z.object({
  columnId: z.string(),
  direction: z.enum(["asc", "desc"]),
});

export type ExistingColumn = z.infer<typeof existingColumnSchema>;
export type ExistingFilter = z.infer<typeof existingFilterSchema>;
export type ExistingSort = z.infer<typeof existingSortSchema>;
