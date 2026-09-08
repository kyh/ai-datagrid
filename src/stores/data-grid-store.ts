import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type {
  CellPosition,
  ContextMenuState,
  PasteDialogState,
  RowHeightValue,
  SelectionState,
} from "@/lib/data-grid-types";
import type { ColumnFiltersState, RowSelectionState, SortingState } from "@tanstack/react-table";

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
  columnFilters: [],
  contextMenu: { open: false, x: 0, y: 0 },
  cutCells: new Set<string>(),
  editingCell: null,
  focusedCell: null,
  generatingCells: new Set<string>(),
  lastClickedRowIndex: null,
  matchIndex: -1,
  pasteDialog: { clipboardText: "", open: false, rowsNeeded: 0 },
  rowHeight: DEFAULT_ROW_HEIGHT,
  rowSelection: {},
  searchMatches: [],
  searchOpen: false,
  searchQuery: "",
  selectionState: {
    isSelecting: false,
    selectedCells: new Set<string>(),
    selectionRange: null,
  },
  sorting: [],
};

// --- Store ---
export type DataGridStore = DataGridState & DataGridActions;

export const useDataGridStore = create<DataGridStore>()(
  devtools(
    (set) => ({
      ...initialState,
      batch: (updates) => set(updates),
      removeGeneratingCell: (cellKey) =>
        set((state) => {
          const next = new Set(state.generatingCells);
          next.delete(cellKey);
          return { generatingCells: next };
        }),
      setColumnFilters: (filters) => set({ columnFilters: filters }),
      setContextMenu: (menu) => set({ contextMenu: menu }),
      setCutCells: (cells) => set({ cutCells: cells }),
      setEditingCell: (cell) => set({ editingCell: cell }),
      setFocusedCell: (cell) => set({ focusedCell: cell }),
      setGeneratingCells: (cells) => set({ generatingCells: cells }),
      setLastClickedRowIndex: (index) => set({ lastClickedRowIndex: index }),
      setMatchIndex: (index) => set({ matchIndex: index }),
      setPasteDialog: (dialog) => set({ pasteDialog: dialog }),
      setRowHeight: (height) => set({ rowHeight: height }),
      setRowSelection: (selection) => set({ rowSelection: selection }),
      setSearchMatches: (matches) => set({ searchMatches: matches }),
      setSearchOpen: (open) => set({ searchOpen: open }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSelectionState: (state) => set({ selectionState: state }),
      setSorting: (sorting) => set({ sorting }),
    }),
    { name: "data-grid-store" },
  ),
);
