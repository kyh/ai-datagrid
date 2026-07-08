import { z } from "zod";

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
 * Schema for update cell
 */
export const updateCellSchema = z.object({
  rowIndex: z.number(),
  columnId: z.string(),
  value: z.unknown(),
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
  const [first, ...rest] = options;
  if (first === undefined) return selectValueSchema;
  return z.object({
    value: z.enum([first, ...rest]).describe("One of the valid options"),
  });
}

/**
 * Creates a multi-select value schema with specific options
 */
export function createMultiSelectValueSchema(options: string[]) {
  const [first, ...rest] = options;
  if (first === undefined) return multiSelectValueSchema;
  return z.object({
    value: z.array(z.enum([first, ...rest])).describe("Array of selected options"),
  });
}
