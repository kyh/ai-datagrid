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
  }>;
}
