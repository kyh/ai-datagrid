import type { Cell, RowData, TableMeta } from "@tanstack/react-table";

export type Direction = "ltr" | "rtl";

export type RowHeightValue = "short" | "medium" | "tall" | "extra-tall";

export interface CellSelectOption {
  label: string;
  value: string;
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
  count?: number;
}

export type CellOpts =
  | {
      variant: "short-text";
    }
  | {
      variant: "long-text";
    }
  | {
      variant: "number";
      min?: number;
      max?: number;
      step?: number;
    }
  | {
      variant: "select";
      options: CellSelectOption[];
    }
  | {
      variant: "multi-select";
      options: CellSelectOption[];
    }
  | {
      variant: "checkbox";
    }
  | {
      variant: "date";
    }
  | {
      variant: "url";
    }
  | {
      variant: "file";
      maxFileSize?: number;
      maxFiles?: number;
      accept?: string;
      multiple?: boolean;
    };

export interface CellUpdate {
  rowIndex: number;
  columnId: string;
  value: unknown;
}

/**
 * Discriminated union for type-safe cell values.
 * Use this for internal operations where type safety is needed.
 * CellUpdate keeps `value: unknown` for runtime boundaries.
 */
export type TypedCellValue =
  | { variant: "short-text"; value: string }
  | { variant: "long-text"; value: string }
  | { variant: "number"; value: number }
  | { variant: "date"; value: string }
  | { variant: "checkbox"; value: boolean }
  | { variant: "select"; value: string }
  | { variant: "multi-select"; value: string[] }
  | { variant: "url"; value: string }
  | { variant: "file"; value: FileCellData[] };

/**
 * Validates that a value matches the expected type for a given cell variant.
 * Returns true if the value is valid for the variant, false otherwise.
 */
export function validateCellValue(variant: CellOpts["variant"], value: unknown): boolean {
  if (value === null || value === undefined) {
    return true; // Allow null/undefined for all variants
  }

  switch (variant) {
    case "short-text":
    case "long-text":
    case "date":
    case "url":
      return typeof value === "string";

    case "number":
      return typeof value === "number" && !Number.isNaN(value);

    case "checkbox":
      return typeof value === "boolean";

    case "select":
      return typeof value === "string";

    case "multi-select":
      return Array.isArray(value) && value.every((item) => typeof item === "string");

    case "file":
      return (
        Array.isArray(value) &&
        value.every(
          (item) =>
            typeof item === "object" &&
            item !== null &&
            typeof item.id === "string" &&
            typeof item.name === "string" &&
            typeof item.size === "number" &&
            typeof item.type === "string",
        )
      );

    default: {
      // oxlint-disable-next-line eslint/no-underscore-dangle -- exhaustiveness sentinel: a new `CellOpts` variant makes this assignment fail
      const _exhaustive: never = variant;
      void _exhaustive;
      return false;
    }
  }
}

/**
 * `options` exists only on the select-like variants of `CellOpts`. Reading it
 * off the union directly does not type-check, and the anonymous structural
 * casts this replaces silently claimed every variant carried it.
 */
/** Every `CellOpts` variant tag, as a runtime list for validating string input. */
export const CELL_VARIANT_TAGS = [
  "short-text",
  "long-text",
  "number",
  "select",
  "multi-select",
  "checkbox",
  "date",
  "url",
  "file",
] as const satisfies ReadonlyArray<CellOpts["variant"]>;

/** Narrow assistant- or form-supplied strings to a known cell variant. */
export function isCellVariant(value: string | undefined): value is CellOpts["variant"] {
  return CELL_VARIANT_TAGS.some((variant) => variant === value);
}

/**
 * The grid addresses cells by column id, so rows it generates are assembled from
 * a runtime column set and cannot be proven to satisfy the caller's nominal row
 * type. This is the single place that widening happens.
 */
export function asRow<TRow extends Record<string, unknown>>(row: Record<string, unknown>): TRow {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- see comment above
  return row as TRow;
}

export function getCellOptions(cell: CellOpts | undefined): CellSelectOption[] | undefined {
  if (!cell) return undefined;
  return cell.variant === "select" || cell.variant === "multi-select" ? cell.options : undefined;
}

declare module "@tanstack/react-table" {
  // TData and TValue are consumed by the augmented interface below.
  interface ColumnMeta<TData extends RowData, TValue> {
    label?: string;
    cell?: CellOpts;
    /** Optional AI prompt for enriching this column's data */
    prompt?: string;
  }

  // TData is consumed by the augmented interface below.
  interface TableMeta<TData extends RowData> {
    dataGridRef?: React.RefObject<HTMLElement | null>;
    cellMapRef?: React.RefObject<Map<string, HTMLDivElement>>;
    focusedCell?: CellPosition | null;
    editingCell?: CellPosition | null;
    selectionState?: SelectionState;
    getVisualRowIndex?: (rowId: string) => number | undefined;
    searchOpen?: boolean;
    getIsCellSelected?: (rowIndex: number, columnId: string) => boolean;
    getIsSearchMatch?: (rowIndex: number, columnId: string) => boolean;
    getIsActiveSearchMatch?: (rowIndex: number, columnId: string) => boolean;
    rowHeight?: RowHeightValue;
    onRowHeightChange?: (value: RowHeightValue) => void;
    onRowSelect?: (rowIndex: number, checked: boolean, shiftKey: boolean) => void;
    onDataUpdate?: (params: CellUpdate | Array<CellUpdate>) => void;
    onRowsDelete?: (rowIndices: number[]) => void | Promise<void>;
    onColumnClick?: (columnId: string) => void;
    onCellClick?: (rowIndex: number, columnId: string, event?: React.MouseEvent) => void;
    onCellDoubleClick?: (rowIndex: number, columnId: string) => void;
    onCellMouseDown?: (rowIndex: number, columnId: string, event: React.MouseEvent) => void;
    onCellMouseEnter?: (rowIndex: number, columnId: string) => void;
    onCellMouseUp?: () => void;
    onCellContextMenu?: (rowIndex: number, columnId: string, event: React.MouseEvent) => void;
    onCellEditingStart?: (rowIndex: number, columnId: string) => void;
    onCellEditingStop?: (opts?: {
      direction?: NavigationDirection;
      moveToNextRow?: boolean;
    }) => void;
    onCellsCopy?: () => void;
    onCellsCut?: () => void;
    onCellsPaste?: (expand?: boolean) => void;
    onSelectionClear?: () => void;
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
    readOnly?: boolean;
    onColumnUpdate?: (
      columnId: string,
      updates: Partial<{
        label: string;
        variant: CellOpts["variant"];
        prompt: string;
        options: CellSelectOption[];
      }>,
    ) => void;
    onColumnDelete?: (columnId: string) => void;
    onEnrichColumn?: (columnId: string, prompt: string) => void;
    onColumnAdd?: (config: {
      label: string;
      variant: CellOpts["variant"];
      prompt: string;
      options?: CellSelectOption[];
      insertAfterColumnId?: string;
    }) => void;
  }
}

export interface CellPosition {
  rowIndex: number;
  columnId: string;
}

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

export interface DataGridCellProps<TData extends Record<string, unknown>> {
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
  isGenerating: boolean;
  readOnly: boolean;
}

export interface FileCellData {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
}

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

export interface FilterValue {
  operator: FilterOperator;
  value?: string | number | string[];
  endValue?: string | number;
}
