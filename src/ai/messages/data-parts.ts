import { z } from "zod";
import {
  cellSchema,
  cellSelectOptionSchema,
  numberCellSchema,
  selectCellSchema,
  multiSelectCellSchema,
  updateCellSchema,
} from "@/lib/data-grid-schema";

// Extract variant types from cell schema
type CellVariant = z.infer<typeof cellSchema>["variant"];

// Schema for column definition
// Reuses cell variant schemas from data-grid-schema
const columnDefinitionSchema = z.object({
  id: z.string(),
  label: z.string(),
  variant: z.enum([
    "short-text",
    "long-text",
    "number",
    "date",
    "select",
    "multi-select",
    "checkbox",
    "url",
    "file",
  ]),
  // Reuse cellSelectOptionSchema for options
  options: z.array(cellSelectOptionSchema).optional(),
  // Reuse number cell schema fields
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  // Optional AI prompt for enriching column data
  prompt: z.string().optional(),
});

// Type for the data field in messages
// All keys are optional - we check which one is present at runtime
export type DataPart = {
  "generate-columns"?: {
    columns: z.infer<typeof columnDefinitionSchema>[];
    status: "done";
  };
  "enrich-data"?: {
    // Reuse updateCellSchema from data-grid-schema
    updates: z.infer<typeof updateCellSchema>[];
    status: "done";
  };
};

// Export schemas for use in tools
export { columnDefinitionSchema };
