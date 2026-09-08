import { z } from "zod";

/**
 * Column info for AI operations. Exported: the `enrich_cells` tool input
 * (src/lib/assistant-schemas.ts) reuses it for its `columns` field.
 */
export const columnInfoSchema = z.object({
  id: z.string(),
  label: z.string(),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  prompt: z.string().optional(),
  variant: z.string(),
});

export type ColumnInfo = z.infer<typeof columnInfoSchema>;

/**
 * Selection context passed to AI for cell-aware operations.
 * When user has cells selected, AI should only populate those cells.
 * Zod schema doubles as the request-body validator in the chat route.
 */
export const selectionContextSchema = z.object({
  bounds: z.object({
    columns: z.array(z.string()),
    maxRow: z.number(),
    minRow: z.number(),
  }),
  currentColumns: z.array(columnInfoSchema),
  /**
   * Row data for context-aware generation.
   * Maps row index to column values (columnId -> value).
   */
  rowData: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
  selectedCells: z.array(z.object({ columnId: z.string(), rowIndex: z.number() })),
});

export type SelectionContext = z.infer<typeof selectionContextSchema>;
