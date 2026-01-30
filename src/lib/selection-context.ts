/**
 * Selection context passed to AI for cell-aware operations.
 * When user has cells selected, AI should only populate those cells.
 */
export interface SelectionContext {
  selectedCells: Array<{ rowIndex: number; columnId: string }>;
  bounds: {
    minRow: number;
    maxRow: number;
    columns: string[];
  };
  currentColumns: Array<{
    id: string;
    label: string;
    variant: string;
    prompt?: string;
    options?: Array<{ label: string; value: string }>;
  }>;
  /**
   * Row data for context-aware generation.
   * Maps row index to column values (columnId -> value).
   */
  rowData?: Record<number, Record<string, unknown>>;
}
