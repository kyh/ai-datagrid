import type { Cell, RowData, TableMeta } from "@tanstack/react-table";
import type { z } from "zod";
import type {
  cellSchema,
  cellSelectOptionSchema,
  fileCellDataSchema,
  rowHeightValueSchema,
  cellPositionSchema,
  updateCellSchema,
  filterValueSchema,
} from "@/lib/data-grid-schema";

// Derive types from Zod schemas
export type CellSelectOption = z.infer<typeof cellSelectOptionSchema> & {
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
};

export type CellOpts = z.infer<typeof cellSchema>;

export type RowHeightValue = z.infer<typeof rowHeightValueSchema>;

export type CellPosition = z.infer<typeof cellPositionSchema>;

export type UpdateCell = z.infer<typeof updateCellSchema>;

export type FileCellData = z.infer<typeof fileCellDataSchema>;

declare module "@tanstack/react-table" {
  // biome-ignore lint/correctness/noUnusedVariables: TData and TValue are used in the ColumnMeta interface
  interface ColumnMeta<TData extends RowData, TValue> {
    label?: string;
    cell?: CellOpts;
    hideVariantLabel?: boolean;
  }

  // biome-ignore lint/correctness/noUnusedVariables: TData is used in the TableMeta interface
  interface TableMeta<TData extends RowData> {
    dataGridRef?: React.RefObject<HTMLElement | null>;
    cellMapRef?: React.RefObject<Map<string, HTMLDivElement>>;
    focusedCell?: CellPosition | null;
    editingCell?: CellPosition | null;
    selectionState?: SelectionState;
    searchOpen?: boolean;
    readOnly?: boolean;
    getIsCellSelected?: (rowIndex: number, columnId: string) => boolean;
    getIsSearchMatch?: (rowIndex: number, columnId: string) => boolean;
    getIsActiveSearchMatch?: (rowIndex: number, columnId: string) => boolean;
    rowHeight?: RowHeightValue;
    onRowHeightChange?: (value: RowHeightValue) => void;
    onRowSelect?: (
      rowIndex: number,
      checked: boolean,
      shiftKey: boolean
    ) => void;
    onDataUpdate?: (params: UpdateCell | Array<UpdateCell>) => void;
    onRowsDelete?: (rowIndices: number[]) => void | Promise<void>;
    onColumnClick?: (columnId: string) => void;
    onCellClick?: (
      rowIndex: number,
      columnId: string,
      event?: React.MouseEvent
    ) => void;
    onCellDoubleClick?: (rowIndex: number, columnId: string) => void;
    onCellMouseDown?: (
      rowIndex: number,
      columnId: string,
      event: React.MouseEvent
    ) => void;
    onCellMouseEnter?: (
      rowIndex: number,
      columnId: string,
      event: React.MouseEvent
    ) => void;
    onCellMouseUp?: () => void;
    onCellContextMenu?: (
      rowIndex: number,
      columnId: string,
      event: React.MouseEvent
    ) => void;
    onCellEditingStart?: (rowIndex: number, columnId: string) => void;
    onCellEditingStop?: (opts?: {
      direction?: NavigationDirection;
      moveToNextRow?: boolean;
    }) => void;
    onCellsCopy?: () => void;
    onCellsCut?: () => void;
    onFilesUpload?: (params: {
      files: File[];
      rowIndex: number;
      columnId: string;
    }) => Promise<FileCellData[]>;
    onFilesDelete?: (params: {
      fileIds: string[];
      rowIndex: number;
      columnId: string;
    }) => void | Promise<void>;
    contextMenu?: ContextMenuState;
    onContextMenuOpenChange?: (open: boolean) => void;
    pasteDialog?: PasteDialogState;
    onPasteDialogOpenChange?: (open: boolean) => void;
    onPasteWithExpansion?: () => void;
    onPasteWithoutExpansion?: () => void;
  }
}

// CellPosition is now derived from schema above

export interface CellRange {
  start: CellPosition;
  end: CellPosition;
}

export interface SelectionState {
  selectedCells: Set<string>;
  selectionRange: CellRange | null;
  isSelecting: boolean;
}

export interface ContextMenuState {
  open: boolean;
  x: number;
  y: number;
}

export interface PasteDialogState {
  open: boolean;
  rowsNeeded: number;
  clipboardText: string;
}

export type NavigationDirection =
  | "up"
  | "down"
  | "left"
  | "right"
  | "home"
  | "end"
  | "ctrl+up"
  | "ctrl+down"
  | "ctrl+home"
  | "ctrl+end"
  | "pageup"
  | "pagedown"
  | "pageleft"
  | "pageright";

export interface SearchState {
  searchMatches: CellPosition[];
  matchIndex: number;
  searchOpen: boolean;
  onSearchOpenChange: (open: boolean) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSearch: (query: string) => void;
  onNavigateToNextMatch: () => void;
  onNavigateToPrevMatch: () => void;
}

export interface DataGridCellProps<TData> {
  cell: Cell<TData, unknown>;
  tableMeta: TableMeta<TData>;
  rowIndex: number;
  columnId: string;
  rowHeight: RowHeightValue;
  isEditing: boolean;
  isFocused: boolean;
  isSelected: boolean;
  isSearchMatch: boolean;
  isActiveSearchMatch: boolean;
  readOnly: boolean;
}

// FileCellData is now derived from schema above

export type TextFilterOperator =
  | "contains"
  | "notContains"
  | "equals"
  | "notEquals"
  | "startsWith"
  | "endsWith"
  | "isEmpty"
  | "isNotEmpty";

export type NumberFilterOperator =
  | "equals"
  | "notEquals"
  | "lessThan"
  | "lessThanOrEqual"
  | "greaterThan"
  | "greaterThanOrEqual"
  | "isBetween"
  | "isEmpty"
  | "isNotEmpty";

export type DateFilterOperator =
  | "equals"
  | "notEquals"
  | "before"
  | "after"
  | "onOrBefore"
  | "onOrAfter"
  | "isBetween"
  | "isEmpty"
  | "isNotEmpty";

export type SelectFilterOperator =
  | "is"
  | "isNot"
  | "isAnyOf"
  | "isNoneOf"
  | "isEmpty"
  | "isNotEmpty";

export type BooleanFilterOperator = "isTrue" | "isFalse";

export type FilterOperator =
  | TextFilterOperator
  | NumberFilterOperator
  | DateFilterOperator
  | SelectFilterOperator
  | BooleanFilterOperator;

// FilterValue is now derived from schema above, but we keep FilterOperator type separate
export type FilterValue = Omit<
  z.infer<typeof filterValueSchema>,
  "operator"
> & {
  operator: FilterOperator;
};
