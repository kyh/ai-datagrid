import { z } from "zod";
import {
  cellSchema,
  cellSelectOptionSchema,
  numberCellSchema,
  selectCellSchema,
  multiSelectCellSchema,
  updateCellSchema,
} from "@/lib/data-grid-schema";

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

// Type for column update
export type ColumnUpdate = z.infer<typeof columnUpdateSchema>;

// Type for the data field in messages
// All keys are optional - we check which one is present at runtime
export type DataPart = {
  "generate-columns"?: {
    columns: z.infer<typeof columnDefinitionSchema>[];
    status: "done";
  };
  "update-columns"?: {
    updates: ColumnUpdate[];
    status: "done";
  };
  "delete-columns"?: {
    columnIds: string[];
    status: "done";
  };
  "enrich-data"?: {
    // Reuse updateCellSchema from data-grid-schema
    updates: z.infer<typeof updateCellSchema>[];
    status: "done";
  };
};

// Export schemas for use in tools
export { columnDefinitionSchema, columnUpdateSchema, columnDeleteSchema, cellVariantSchema };
