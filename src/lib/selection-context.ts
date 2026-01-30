/**
 * Column info for AI operations.
 */
export interface ColumnInfo {
  id: string;
  label: string;
  variant: string;
  prompt?: string;
  options?: Array<{ label: string; value: string }>;
}

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
  currentColumns: ColumnInfo[];
  /**
   * Row data for context-aware generation.
   * Maps row index to column values (columnId -> value).
   */
  rowData?: Record<number, Record<string, unknown>>;
}
