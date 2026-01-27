import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type {
  CellPosition,
  ContextMenuState,
  PasteDialogState,
  RowHeightValue,
  SelectionState,
} from "@/lib/data-grid-types";
import type {
  ColumnFiltersState,
  RowSelectionState,
  SortingState,
} from "@tanstack/react-table";

const DEFAULT_ROW_HEIGHT: RowHeightValue = "short";

// --- State ---
interface DataGridState {
  // UI
  focusedCell: CellPosition | null;
  editingCell: CellPosition | null;
  contextMenu: ContextMenuState;
  pasteDialog: PasteDialogState;

  // Selection
  selectionState: SelectionState;
  rowSelection: RowSelectionState;
  cutCells: Set<string>;
  lastClickedRowIndex: number | null;

  // Search
  searchQuery: string;
  searchMatches: CellPosition[];
  matchIndex: number;
  searchOpen: boolean;

  // Config
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  rowHeight: RowHeightValue;

  // AI
  generatingCells: Set<string>;
}

// --- Actions ---
interface DataGridActions {
  // UI Actions
  setFocusedCell: (cell: CellPosition | null) => void;
  setEditingCell: (cell: CellPosition | null) => void;
  setContextMenu: (menu: ContextMenuState) => void;
  setPasteDialog: (dialog: PasteDialogState) => void;

  // Selection Actions
  setSelectionState: (state: SelectionState) => void;
  setRowSelection: (selection: RowSelectionState) => void;
  setCutCells: (cells: Set<string>) => void;
  setLastClickedRowIndex: (index: number | null) => void;

  // Search Actions
  setSearchQuery: (query: string) => void;
  setSearchMatches: (matches: CellPosition[]) => void;
  setMatchIndex: (index: number) => void;
  setSearchOpen: (open: boolean) => void;

  // Config Actions
  setSorting: (sorting: SortingState) => void;
  setColumnFilters: (filters: ColumnFiltersState) => void;
  setRowHeight: (height: RowHeightValue) => void;

  // AI Actions
  removeGeneratingCell: (cellKey: string) => void;
  setGeneratingCells: (cells: Set<string>) => void;

  // Batch update
  batch: (updates: Partial<DataGridState>) => void;
}

// --- Initial State ---
const initialState: DataGridState = {
  // UI
  focusedCell: null,
  editingCell: null,
  contextMenu: { open: false, x: 0, y: 0 },
  pasteDialog: { open: false, rowsNeeded: 0, clipboardText: "" },

  // Selection
  selectionState: {
    selectedCells: new Set<string>(),
    selectionRange: null,
    isSelecting: false,
  },
  rowSelection: {},
  cutCells: new Set<string>(),
  lastClickedRowIndex: null,

  // Search
  searchQuery: "",
  searchMatches: [],
  matchIndex: -1,
  searchOpen: false,

  // Config
  sorting: [],
  columnFilters: [],
  rowHeight: DEFAULT_ROW_HEIGHT,

  // AI
  generatingCells: new Set<string>(),
};

// --- Store ---
export type DataGridStore = DataGridState & DataGridActions;

export const useDataGridStore = create<DataGridStore>()(
  devtools(
    (set) => ({
      ...initialState,

      // UI Actions
      setFocusedCell: (cell) => set({ focusedCell: cell }),
      setEditingCell: (cell) => set({ editingCell: cell }),
      setContextMenu: (menu) => set({ contextMenu: menu }),
      setPasteDialog: (dialog) => set({ pasteDialog: dialog }),

      // Selection Actions
      setSelectionState: (state) => set({ selectionState: state }),
      setRowSelection: (selection) => set({ rowSelection: selection }),
      setCutCells: (cells) => set({ cutCells: cells }),
      setLastClickedRowIndex: (index) => set({ lastClickedRowIndex: index }),

      // Search Actions
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSearchMatches: (matches) => set({ searchMatches: matches }),
      setMatchIndex: (index) => set({ matchIndex: index }),
      setSearchOpen: (open) => set({ searchOpen: open }),

      // Config Actions
      setSorting: (sorting) => set({ sorting }),
      setColumnFilters: (filters) => set({ columnFilters: filters }),
      setRowHeight: (height) => set({ rowHeight: height }),

      // AI Actions
      removeGeneratingCell: (cellKey) =>
        set((state) => {
          const next = new Set(state.generatingCells);
          next.delete(cellKey);
          return { generatingCells: next };
        }),
      setGeneratingCells: (cells) => set({ generatingCells: cells }),

      // Batch update for multiple state changes
      batch: (updates) => set(updates),
    }),
    { name: "data-grid-store" }
  )
);
