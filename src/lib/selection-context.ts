import { z } from "zod";

/**
 * Column info for AI operations. Exported: the `enrich_cells` tool input
 * (src/lib/assistant-schemas.ts) reuses it for its `columns` field.
 */
export const columnInfoSchema = z.object({
  id: z.string(),
  label: z.string(),
  variant: z.string(),
  prompt: z.string().optional(),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
});

export type ColumnInfo = z.infer<typeof columnInfoSchema>;

/**
 * Selection context passed to AI for cell-aware operations.
 * When user has cells selected, AI should only populate those cells.
 * Zod schema doubles as the request-body validator in the chat route.
 */
export const selectionContextSchema = z.object({
  selectedCells: z.array(z.object({ rowIndex: z.number(), columnId: z.string() })),
  bounds: z.object({
    minRow: z.number(),
    maxRow: z.number(),
    columns: z.array(z.string()),
  }),
  currentColumns: z.array(columnInfoSchema),
  /**
   * Row data for context-aware generation.
   * Maps row index to column values (columnId -> value).
   */
  rowData: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
});

export type SelectionContext = z.infer<typeof selectionContextSchema>;
