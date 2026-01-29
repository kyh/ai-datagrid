import { z } from "zod";

/**
 * Schema for short-text cell variant
 */
export const shortTextCellSchema = z.object({
  variant: z.literal("short-text"),
});

/**
 * Schema for long-text cell variant
 */
export const longTextCellSchema = z.object({
  variant: z.literal("long-text"),
});

/**
 * Schema for number cell variant
 */
export const numberCellSchema = z.object({
  variant: z.literal("number"),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
});

/**
 * Schema for cell select option
 */
export const cellSelectOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
  icon: z.any().optional().describe("React component for the icon"),
  count: z.number().optional(),
});

/**
 * Schema for select cell variant
 */
export const selectCellSchema = z.object({
  variant: z.literal("select"),
  options: z.array(cellSelectOptionSchema),
});

/**
 * Schema for multi-select cell variant
 */
export const multiSelectCellSchema = z.object({
  variant: z.literal("multi-select"),
  options: z.array(cellSelectOptionSchema),
});

/**
 * Schema for checkbox cell variant
 */
export const checkboxCellSchema = z.object({
  variant: z.literal("checkbox"),
});

/**
 * Schema for date cell variant
 */
export const dateCellSchema = z.object({
  variant: z.literal("date"),
});

/**
 * Schema for url cell variant
 */
export const urlCellSchema = z.object({
  variant: z.literal("url"),
});

/**
 * Schema for file cell variant
 */
export const fileCellSchema = z.object({
  variant: z.literal("file"),
  maxFileSize: z.number().optional(),
  maxFiles: z.number().optional(),
  accept: z.string().optional(),
  multiple: z.boolean().optional(),
});

/**
 * Schema for file cell data
 */
export const fileCellDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number(),
  type: z.string(),
  url: z.string().optional(),
});

/**
 * Schema for all cell options (discriminated union)
 */
export const cellSchema = z.discriminatedUnion("variant", [
  shortTextCellSchema,
  longTextCellSchema,
  numberCellSchema,
  selectCellSchema,
  multiSelectCellSchema,
  checkboxCellSchema,
  dateCellSchema,
  urlCellSchema,
  fileCellSchema,
]);

/**
 * Schema for row height value
 */
export const rowHeightValueSchema = z.enum([
  "short",
  "medium",
  "tall",
  "extra-tall",
]);

/**
 * Schema for cell position
 */
export const cellPositionSchema = z.object({
  rowIndex: z.number(),
  columnId: z.string(),
});

/**
 * Schema for update cell
 */
export const updateCellSchema = z.object({
  rowIndex: z.number(),
  columnId: z.string(),
  value: z.unknown(),
});

/**
 * Schema for filter value
 */
export const filterValueSchema = z.object({
  operator: z.string(),
  value: z.union([z.string(), z.number(), z.array(z.string())]).optional(),
  endValue: z.union([z.string(), z.number()]).optional(),
});

// -----------------------------------------------------------------------------
// Cell Value Schemas (for AI-generated cell values)
// -----------------------------------------------------------------------------

/**
 * Schema for short-text cell value
 */
export const shortTextValueSchema = z.object({
  value: z.string().describe("Text content for this cell"),
});

/**
 * Schema for long-text cell value
 */
export const longTextValueSchema = z.object({
  value: z.string().describe("Multi-line text content"),
});

/**
 * Schema for number cell value
 */
export const numberValueSchema = z.object({
  value: z.number().describe("A numeric value for this cell"),
});

/**
 * Schema for checkbox cell value
 */
export const checkboxValueSchema = z.object({
  value: z.boolean().describe("A boolean value (true or false)"),
});

/**
 * Schema for date cell value
 */
export const dateValueSchema = z.object({
  value: z.string().describe("A date in ISO format (YYYY-MM-DD)"),
});

/**
 * Schema for url cell value
 */
export const urlValueSchema = z.object({
  value: z.string().url().describe("A valid URL"),
});

/**
 * Schema for select cell value (generic, without specific options)
 */
export const selectValueSchema = z.object({
  value: z.string().describe("A single selection value"),
});

/**
 * Schema for multi-select cell value (generic, without specific options)
 */
export const multiSelectValueSchema = z.object({
  value: z.array(z.string()).describe("Array of selected values"),
});

/**
 * Creates a select value schema with specific options
 */
export function createSelectValueSchema(options: string[]) {
  if (options.length === 0) return selectValueSchema;
  const values = options as [string, ...string[]];
  return z.object({
    value: z.enum(values).describe("One of the valid options"),
  });
}

/**
 * Creates a multi-select value schema with specific options
 */
export function createMultiSelectValueSchema(options: string[]) {
  if (options.length === 0) return multiSelectValueSchema;
  const values = options as [string, ...string[]];
  return z.object({
    value: z.array(z.enum(values)).describe("Array of selected options"),
  });
}
