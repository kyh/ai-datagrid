"use client";

import { useDirection } from "@base-ui/react/direction-provider";
import { functionalUpdate, useTable } from "@tanstack/react-table";
import type {
  Cell,
  Column,
  ColumnDef,
  ColumnFiltersState,
  ColumnSizingState,
  Header,
  Row,
  RowSelectionState,
  SortingState,
  TableMeta,
  TableOptions,
  TableState,
  Updater,
} from "@tanstack/react-table";
import { z } from "zod";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Virtualizer } from "@tanstack/react-virtual";
import * as React from "react";
import { toast } from "sonner";

import { useAsRef } from "@/hooks/use-as-ref";
import { useIsomorphicLayoutEffect } from "@/hooks/use-isomorphic-layout-effect";
import { useLazyRef } from "@/hooks/use-lazy-ref";
import { dataGridFeatures } from "@/lib/data-grid-features";
import type { DataGridFeatures } from "@/lib/data-grid-features";
import {
  formatDateForDisplay,
  getCellKey,
  getIsInPopover,
  getRowHeightValue,
  getScrollDirection,
  matchSelectOption,
  parseCellKey,
  parseTsv,
  scrollCellIntoView,
} from "@/lib/data-grid";
import { fileCellDataSchema } from "@/lib/data-grid-schema";
import type {
  CellOpts,
  CellPosition,
  CellSelectOption,
  CellUpdate,
  CellValue,
  DataGridRowData,
  Direction,
  FileCellData,
  NavigationDirection,
  RowHeightValue,
  SearchState,
} from "@/lib/data-grid-types";
import { useDataGridStore } from "@/stores/data-grid-store";
import type { DataGridStore } from "@/stores/data-grid-store";
import { useShallow } from "zustand/react/shallow";

const DEFAULT_ROW_HEIGHT = "short";
const OVERSCAN = 6;
const VIEWPORT_OFFSET = 1;
const HORIZONTAL_PAGE_SIZE = 5;
const SCROLL_SYNC_RETRY_COUNT = 16;
const MIN_COLUMN_SIZE = 60;
const MAX_COLUMN_SIZE = 800;
const SEARCH_SHORTCUT_KEY = "f";
const NON_NAVIGABLE_COLUMN_IDS = new Set(["select", "actions"]);

const DOMAIN_REGEX = /^[\w.-]+\.[a-z]{2,}(?:\/\S*)?$/iu;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}.*)?$/u;
const TRUTHY_BOOLEANS = new Set(["true", "1", "yes", "checked"]);
const VALID_BOOLEANS = new Set(["true", "false", "1", "0", "yes", "no", "checked", "unchecked"]);

interface UseDataGridProps<TData extends DataGridRowData> extends Omit<
  TableOptions<DataGridFeatures, TData>,
  // `features` is supplied by the hook, not the caller: every grid shares one
  // feature set, and the hook's own type annotations depend on it.
  "pageCount" | "features"
> {
  onDataChange?: (data: TData[]) => void;
  onRowAdd?: (
    event?: React.MouseEvent<HTMLDivElement>,
  ) => Partial<CellPosition> | Promise<Partial<CellPosition> | null> | null;
  onRowsAdd?: (count: number) => void | Promise<void>;
  onRowsDelete?: (rows: TData[], rowIndices: number[]) => void | Promise<void>;
  onPaste?: (updates: CellUpdate[]) => void | Promise<void>;
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
  onColumnUpdate?: (
    columnId: string,
    updates: Partial<{
      label: string;
      variant: CellOpts["variant"];
      prompt: string;
    }>,
  ) => void;
  onColumnDelete?: (columnId: string) => void;
  onEnrichColumn?: (columnId: string, prompt: string) => void;
  onColumnAdd?: (config: {
    label: string;
    variant: CellOpts["variant"];
    prompt: string;
    insertAfterColumnId?: string;
  }) => void;
  rowHeight?: RowHeightValue;
  onRowHeightChange?: (rowHeight: RowHeightValue) => void;
  overscan?: number;
  dir?: Direction;
  autoFocus?: boolean | Partial<CellPosition>;
  enableColumnSelection?: boolean;
  enableSingleCellSelection?: boolean;
  enableSearch?: boolean;
  enablePaste?: boolean;
  readOnly?: boolean;
}

/**
 * The grid addresses cells by column id, so a row it has generated or edited is
 * assembled from a runtime column set and cannot be proven to still satisfy the
 * caller's nominal row type. `TData extends DataGridRowData` gets the
 * reads type-checked; this is the single place the dynamic writes are widened
 * back to `TData`.
 */
const asRow = <TRow extends DataGridRowData>(row: DataGridRowData): TRow =>
  // SAFETY: the grid addresses cells only through string column ids, so every
  // read and write on `TRow` goes through the same open-dictionary contract the
  // input satisfies; the nominal row type adds no fields the grid could miss.
  row as TRow;

const sleep = (ms: number) =>
  // oxlint-disable-next-line promise/avoid-new -- a timer has no promise form
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const nextFrame = () =>
  // oxlint-disable-next-line promise/avoid-new -- a frame callback has no promise form
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

const getColumnIds = <TData extends DataGridRowData>(
  columnDefs: UseDataGridProps<TData>["columns"],
): string[] =>
  columnDefs.flatMap((c) => {
    if (c.id) {
      return [c.id];
    }
    if ("accessorKey" in c) {
      const id = String(c.accessorKey);
      return id ? [id] : [];
    }
    return [];
  });

type RowUpdate = Omit<CellUpdate, "rowIndex">;

/**
 * A sorted or filtered table shows rows out of data order, so an update
 * addressed by table row index is mapped back to the row's index in `data`.
 * Falls back to the table index when the row is not in `data` (mid-mutation).
 */
const resolveDataRowIndex = <TData extends DataGridRowData>(
  update: CellUpdate,
  rows: Row<DataGridFeatures, TData>[] | undefined,
  currentData: readonly TData[],
): number | null => {
  if (!rows) {
    return update.rowIndex;
  }
  const row = rows[update.rowIndex];
  if (!row) {
    return null;
  }
  const originalRowIndex = currentData.indexOf(row.original);
  return originalRowIndex === -1 ? update.rowIndex : originalRowIndex;
};

const groupUpdatesByRow = <TData extends DataGridRowData>(
  updates: CellUpdate[],
  rows: Row<DataGridFeatures, TData>[] | undefined,
  currentData: readonly TData[],
): Map<number, RowUpdate[]> => {
  const rowUpdatesMap = new Map<number, RowUpdate[]>();
  for (const update of updates) {
    const targetIndex = resolveDataRowIndex(update, rows, currentData);
    if (targetIndex === null) {
      continue;
    }
    const existingUpdates = rowUpdatesMap.get(targetIndex) ?? [];
    existingUpdates.push({ columnId: update.columnId, value: update.value });
    rowUpdatesMap.set(targetIndex, existingUpdates);
  }
  return rowUpdatesMap;
};

const applyRowUpdates = <TData extends DataGridRowData>(
  rowUpdatesMap: Map<number, RowUpdate[]>,
  rows: Row<DataGridFeatures, TData>[] | undefined,
  currentData: readonly TData[],
): TData[] => {
  const tableRowCount = rows?.length ?? currentData.length;
  const newData: TData[] = Array.from({ length: tableRowCount });

  for (let i = 0; i < tableRowCount; i += 1) {
    const baseRow = currentData[i] ?? rows?.[i]?.original ?? asRow<TData>({});
    const rowUpdates = rowUpdatesMap.get(i);
    if (!rowUpdates) {
      newData[i] = baseRow;
      continue;
    }
    const updatedRow: DataGridRowData = { ...baseRow };
    for (const { columnId, value } of rowUpdates) {
      updatedRow[columnId] = value;
    }
    newData[i] = asRow<TData>(updatedRow);
  }

  return newData;
};

const getSelectedCellKeys = (state: DataGridStore): string[] | null => {
  if (state.selectionState.selectedCells.size) {
    return [...state.selectionState.selectedCells];
  }
  if (!state.focusedCell) {
    return null;
  }
  return [getCellKey(state.focusedCell.rowIndex, state.focusedCell.columnId)];
};

const serializeCell = <TData extends DataGridRowData>(
  cell: Cell<DataGridFeatures, TData>,
): string => {
  const value = cell.getValue();
  const cellVariant = cell.column.columnDef?.meta?.cell?.variant;
  if (cellVariant === "file" || cellVariant === "multi-select") {
    return value ? JSON.stringify(value) : "";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value ?? "");
};

const buildTsv = <TData extends DataGridRowData>(
  cellKeys: string[],
  rows: Row<DataGridFeatures, TData>[],
): string => {
  const selectedColumnIds: string[] = [];
  for (const cellKey of cellKeys) {
    const { columnId } = parseCellKey(cellKey);
    if (columnId && !selectedColumnIds.includes(columnId)) {
      selectedColumnIds.push(columnId);
    }
  }

  const cellData = new Map<string, string>();
  for (const cellKey of cellKeys) {
    const { rowIndex, columnId } = parseCellKey(cellKey);
    const cell = rows[rowIndex]?.getVisibleCells().find((c) => c.column.id === columnId);
    if (cell) {
      cellData.set(cellKey, serializeCell(cell));
    }
  }

  const rowIndices = new Set<number>();
  const colIndices = new Set<number>();
  for (const cellKey of cellKeys) {
    const { rowIndex, columnId } = parseCellKey(cellKey);
    rowIndices.add(rowIndex);
    const colIndex = selectedColumnIds.indexOf(columnId);
    if (colIndex !== -1) {
      colIndices.add(colIndex);
    }
  }

  const sortedRowIndices = [...rowIndices].toSorted((a, b) => a - b);
  const sortedColIndices = [...colIndices].toSorted((a, b) => a - b);
  const sortedColumnIds = sortedColIndices.map((i) => selectedColumnIds[i]);

  return sortedRowIndices
    .map((rowIndex) =>
      sortedColumnIds.map((columnId) => cellData.get(`${rowIndex}:${columnId}`) ?? "").join("\t"),
    )
    .join("\n");
};

const getEmptyCellValue = (cellVariant: CellOpts["variant"] | undefined): CellValue => {
  if (cellVariant === "multi-select" || cellVariant === "file") {
    return [];
  }
  if (cellVariant === "number" || cellVariant === "date") {
    return null;
  }
  if (cellVariant === "checkbox") {
    return false;
  }
  return "";
};

const getClearUpdates = <TData extends DataGridRowData>(
  cellKeys: Iterable<string>,
  tableColumns: Column<DataGridFeatures, TData>[],
): CellUpdate[] => {
  const updates: CellUpdate[] = [];
  for (const cellKey of cellKeys) {
    const { rowIndex, columnId } = parseCellKey(cellKey);
    const column = tableColumns.find((c) => c.id === columnId);
    updates.push({
      columnId,
      rowIndex,
      value: getEmptyCellValue(column?.columnDef?.meta?.cell?.variant),
    });
  }
  return updates;
};

type PasteCoercion = { skip: true } | { skip: false; value: CellValue };

const SKIP_CELL: PasteCoercion = { skip: true };
const acceptCell = (value: CellValue): PasteCoercion => ({ skip: false, value });

const parseJsonArray = (text: string): unknown[] | null => {
  try {
    const parsed: unknown = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const coerceNumber = (pastedValue: string): PasteCoercion => {
  if (!pastedValue) {
    return acceptCell(null);
  }
  const num = Number(pastedValue);
  return Number.isNaN(num) ? SKIP_CELL : acceptCell(num);
};

const coerceCheckbox = (pastedValue: string): PasteCoercion => {
  if (!pastedValue) {
    return acceptCell(false);
  }
  const lower = pastedValue.toLowerCase();
  return VALID_BOOLEANS.has(lower) ? acceptCell(TRUTHY_BOOLEANS.has(lower)) : SKIP_CELL;
};

const coerceDate = (pastedValue: string): PasteCoercion => {
  if (!pastedValue) {
    return acceptCell(null);
  }
  const date = new Date(pastedValue);
  return Number.isNaN(date.getTime()) ? SKIP_CELL : acceptCell(date);
};

const coerceSelect = (pastedValue: string, options: CellSelectOption[]): PasteCoercion => {
  if (!pastedValue) {
    return acceptCell("");
  }
  const matched = matchSelectOption(pastedValue, options);
  return matched ? acceptCell(matched) : SKIP_CELL;
};

const parsePastedList = (pastedValue: string): string[] => {
  const parsed = parseJsonArray(pastedValue);
  if (parsed) {
    return parsed.filter((v): v is string => z.string().safeParse(v).success);
  }
  return pastedValue ? pastedValue.split(",").map((v) => v.trim()) : [];
};

const coerceMultiSelect = (pastedValue: string, options: CellSelectOption[]): PasteCoercion => {
  const values = parsePastedList(pastedValue);
  const validated = values.map((v) => matchSelectOption(v, options)).filter((v) => v !== undefined);
  return values.length > 0 && validated.length === 0 ? SKIP_CELL : acceptCell(validated);
};

const coerceFile = (pastedValue: string): PasteCoercion => {
  if (!pastedValue) {
    return acceptCell([]);
  }
  const parsed = parseJsonArray(pastedValue);
  if (!parsed) {
    return SKIP_CELL;
  }
  const validFiles: FileCellData[] = [];
  for (const item of parsed) {
    const file = fileCellDataSchema.safeParse(item);
    if (file.success) {
      validFiles.push(file.data);
    }
  }
  return parsed.length > 0 && validFiles.length === 0 ? SKIP_CELL : acceptCell(validFiles);
};

const coerceUrl = (pastedValue: string): PasteCoercion => {
  if (!pastedValue) {
    return acceptCell("");
  }
  if (pastedValue.startsWith("[") || pastedValue.startsWith("{")) {
    return SKIP_CELL;
  }
  return URL.canParse(pastedValue) || DOMAIN_REGEX.test(pastedValue)
    ? acceptCell(pastedValue)
    : SKIP_CELL;
};

const formatBooleanText = (value: boolean) => (value ? "Checked" : "Unchecked");

const formatStructuredText = (pastedValue: string): string => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(pastedValue);
  } catch {
    const lower = pastedValue.toLowerCase();
    return lower === "true" || lower === "false"
      ? formatBooleanText(lower === "true")
      : pastedValue;
  }

  if (Array.isArray(parsed)) {
    const files = z.array(fileCellDataSchema).safeParse(parsed);
    if (parsed.length > 0 && files.success) {
      return files.data.map((f) => f.name).join(", ");
    }
    const strings = z.array(z.string()).safeParse(parsed);
    return strings.success ? strings.data.join(", ") : pastedValue;
  }

  const bool = z.boolean().safeParse(parsed);
  return bool.success ? formatBooleanText(bool.data) : pastedValue;
};

const STRUCTURED_TEXT_PREFIXES = ["[", "{", "t", "f"];

const coerceText = (pastedValue: string): PasteCoercion => {
  if (!pastedValue) {
    return acceptCell("");
  }

  if (ISO_DATE_REGEX.test(pastedValue)) {
    const date = new Date(pastedValue);
    if (!Number.isNaN(date.getTime())) {
      // Format the calendar date, not the instant: `new Date("2026-07-19")`
      // is UTC midnight, so `toLocaleDateString()` renders the previous
      // day west of UTC. The regex guarantees a YYYY-MM-DD prefix.
      return acceptCell(formatDateForDisplay(pastedValue.slice(0, 10)));
    }
  }

  if (STRUCTURED_TEXT_PREFIXES.some((prefix) => pastedValue.startsWith(prefix))) {
    return acceptCell(formatStructuredText(pastedValue));
  }

  return acceptCell(pastedValue);
};

const coercePastedValue = (pastedValue: string, cellOpts: CellOpts | undefined): PasteCoercion => {
  switch (cellOpts?.variant) {
    case "number": {
      return coerceNumber(pastedValue);
    }
    case "checkbox": {
      return coerceCheckbox(pastedValue);
    }
    case "date": {
      return coerceDate(pastedValue);
    }
    case "select": {
      return coerceSelect(pastedValue, cellOpts.options);
    }
    case "multi-select": {
      return coerceMultiSelect(pastedValue, cellOpts.options);
    }
    case "file": {
      return coerceFile(pastedValue);
    }
    case "url": {
      return coerceUrl(pastedValue);
    }
    default: {
      return coerceText(pastedValue);
    }
  }
};

interface PasteTarget<TData extends DataGridRowData> {
  startRowIndex: number;
  startColIndex: number;
  rowCount: number;
  navigableColumnIds: string[];
  columnMap: Map<string, Column<DataGridFeatures, TData>>;
}

interface PasteResult {
  updates: CellUpdate[];
  cellsSkipped: number;
  endRowIndex: number;
  endColIndex: number;
}

const collectPasteUpdates = <TData extends DataGridRowData>(
  pastedData: string[][],
  { startRowIndex, startColIndex, rowCount, navigableColumnIds, columnMap }: PasteTarget<TData>,
): PasteResult => {
  const updates: CellUpdate[] = [];
  let cellsSkipped = 0;
  let endRowIndex = startRowIndex;
  let endColIndex = startColIndex;

  for (const [pasteRowIdx, pasteRow] of pastedData.entries()) {
    const targetRowIndex = startRowIndex + pasteRowIdx;
    if (targetRowIndex >= rowCount) {
      break;
    }

    for (const [pasteColIdx, pastedValue] of pasteRow.entries()) {
      const targetColIndex = startColIndex + pasteColIdx;
      if (targetColIndex >= navigableColumnIds.length) {
        break;
      }

      const targetColumnId = navigableColumnIds[targetColIndex];
      if (!targetColumnId) {
        continue;
      }

      const cellOpts = columnMap.get(targetColumnId)?.columnDef?.meta?.cell;
      const coerced = coercePastedValue(pastedValue, cellOpts);

      endRowIndex = Math.max(endRowIndex, targetRowIndex);
      endColIndex = Math.max(endColIndex, targetColIndex);

      if (coerced.skip) {
        cellsSkipped += 1;
        continue;
      }

      updates.push({
        columnId: targetColumnId,
        rowIndex: targetRowIndex,
        value: coerced.value,
      });
    }
  }

  return { cellsSkipped, endColIndex, endRowIndex, updates };
};

const toastPasteResult = (cellsUpdated: number, cellsSkipped: number) => {
  if (cellsUpdated === 0) {
    if (cellsSkipped > 0) {
      toast.error(
        `${cellsSkipped} cell${cellsSkipped === 1 ? "" : "s"} skipped pasting for invalid data`,
      );
    }
    return;
  }
  const label = `${cellsUpdated} cell${cellsUpdated === 1 ? "" : "s"} pasted`;
  toast.success(cellsSkipped > 0 ? `${label}, ${cellsSkipped} skipped` : label);
};

interface RowPromptInput {
  rowsNeeded: number;
  expandRows: boolean;
  canAddRows: boolean;
  hasDialogText: boolean;
}

const shouldPromptForRows = ({
  rowsNeeded,
  expandRows,
  canAddRows,
  hasDialogText,
}: RowPromptInput) => rowsNeeded > 0 && !expandRows && canAddRows && !hasDialogText;

const START_ALIGN_DIRECTIONS = new Set<NavigationDirection>([
  "up",
  "pageup",
  "ctrl+up",
  "ctrl+home",
]);
const END_ALIGN_DIRECTIONS = new Set<NavigationDirection>([
  "down",
  "pagedown",
  "ctrl+down",
  "ctrl+end",
]);

const isVerticalNavigation = (direction: NavigationDirection) =>
  START_ALIGN_DIRECTIONS.has(direction) || END_ALIGN_DIRECTIONS.has(direction);

const getScrollAlign = (direction: NavigationDirection): "start" | "end" | "center" => {
  if (START_ALIGN_DIRECTIONS.has(direction)) {
    return "start";
  }
  if (END_ALIGN_DIRECTIONS.has(direction)) {
    return "end";
  }
  return "center";
};

const getAdjacentColumnId = (
  columnIds: string[],
  currentColIndex: number,
  direction: "left" | "right",
  isRtl: boolean,
): string | undefined => {
  const offset = (direction === "left") === isRtl ? 1 : -1;
  return columnIds[currentColIndex + offset];
};

interface NavigationBounds {
  rowCount: number;
  pageSize: number;
}

const resolveNavigationRow = (
  direction: NavigationDirection,
  rowIndex: number,
  { rowCount, pageSize }: NavigationBounds,
): number => {
  switch (direction) {
    case "up": {
      return Math.max(0, rowIndex - 1);
    }
    case "down": {
      return Math.min(rowCount - 1, rowIndex + 1);
    }
    case "ctrl+home":
    case "ctrl+up": {
      return 0;
    }
    case "ctrl+end":
    case "ctrl+down": {
      return Math.max(0, rowCount - 1);
    }
    case "pageup": {
      return Math.max(0, rowIndex - pageSize);
    }
    case "pagedown": {
      return Math.min(rowCount - 1, rowIndex + pageSize);
    }
    default: {
      return rowIndex;
    }
  }
};

const resolveNavigationColumn = (
  direction: NavigationDirection,
  columnId: string,
  navigableColumnIds: string[],
  isRtl: boolean,
): string => {
  const currentColIndex = navigableColumnIds.indexOf(columnId);
  switch (direction) {
    case "left":
    case "right": {
      return getAdjacentColumnId(navigableColumnIds, currentColIndex, direction, isRtl) ?? columnId;
    }
    case "home":
    case "ctrl+home": {
      return navigableColumnIds[0] ?? columnId;
    }
    case "end":
    case "ctrl+end": {
      return navigableColumnIds.at(-1) ?? columnId;
    }
    case "pageleft": {
      if (currentColIndex <= 0) {
        return columnId;
      }
      return navigableColumnIds[Math.max(0, currentColIndex - HORIZONTAL_PAGE_SIZE)] ?? columnId;
    }
    case "pageright": {
      const lastIndex = navigableColumnIds.length - 1;
      if (currentColIndex >= lastIndex) {
        return columnId;
      }
      return (
        navigableColumnIds[Math.min(lastIndex, currentColIndex + HORIZONTAL_PAGE_SIZE)] ?? columnId
      );
    }
    default: {
      return columnId;
    }
  }
};

/**
 * Shift+arrow extends the selection one step; only the plain directions move
 * the edge, everything else re-selects the current range.
 */
const stepSelectionEdge = (
  direction: NavigationDirection,
  edge: CellPosition,
  navigableColumnIds: string[],
  rowCount: number,
  isRtl: boolean,
): CellPosition => {
  switch (direction) {
    case "up":
    case "down": {
      return {
        columnId: edge.columnId,
        rowIndex: resolveNavigationRow(direction, edge.rowIndex, { pageSize: 0, rowCount }),
      };
    }
    case "left":
    case "right":
    case "home":
    case "end": {
      return {
        columnId: resolveNavigationColumn(direction, edge.columnId, navigableColumnIds, isRtl),
        rowIndex: edge.rowIndex,
      };
    }
    default: {
      return { columnId: edge.columnId, rowIndex: edge.rowIndex };
    }
  }
};

const getViewportBounds = (
  container: HTMLElement,
  header: HTMLElement | null,
  footer: HTMLElement | null,
) => {
  const containerRect = container.getBoundingClientRect();
  const headerHeight = header?.getBoundingClientRect().height ?? 0;
  const footerHeight = footer?.getBoundingClientRect().height ?? 0;
  return {
    bottom: containerRect.bottom - footerHeight - VIEWPORT_OFFSET,
    top: containerRect.top + headerHeight + VIEWPORT_OFFSET,
  };
};

const scrollRowIntoView = (
  container: HTMLElement,
  targetRow: HTMLElement,
  direction: NavigationDirection,
  header: HTMLElement | null,
  footer: HTMLElement | null,
): boolean => {
  if (!isVerticalNavigation(direction)) {
    return false;
  }
  const { top, bottom } = getViewportBounds(container, header, footer);
  const rowRect = targetRow.getBoundingClientRect();
  if (rowRect.top >= top && rowRect.bottom <= bottom) {
    return false;
  }
  if (END_ALIGN_DIRECTIONS.has(direction)) {
    container.scrollTop += rowRect.bottom - bottom;
  } else {
    container.scrollTop -= top - rowRect.top;
  }
  return true;
};

const HORIZONTAL_STEP_DIRECTIONS = new Set<NavigationDirection>(["left", "right", "home", "end"]);

const hasAnySelection = (state: DataGridStore) =>
  state.selectionState.selectedCells.size > 0 || Object.keys(state.rowSelection).length > 0;

const getRowIndicesToDelete = <TData extends DataGridRowData>(
  state: DataGridStore,
  rows: Row<DataGridFeatures, TData>[],
): number[] => {
  if (Object.keys(state.rowSelection).length > 0) {
    return rows.filter((row) => state.rowSelection[row.id]).map((row) => row.index);
  }
  if (state.selectionState.selectedCells.size > 0) {
    const rowIndices = new Set<number>();
    for (const cellKey of state.selectionState.selectedCells) {
      rowIndices.add(parseCellKey(cellKey).rowIndex);
    }
    return [...rowIndices];
  }
  if (state.focusedCell) {
    return [state.focusedCell.rowIndex];
  }
  return [];
};

interface KeyChord {
  key: string;
  altKey: boolean;
  shiftKey: boolean;
  isCtrlPressed: boolean;
}

const resolveArrowDirection = ({
  key,
  altKey,
  shiftKey,
  isCtrlPressed,
}: KeyChord): NavigationDirection | null => {
  switch (key) {
    case "ArrowUp": {
      if (altKey && !isCtrlPressed && !shiftKey) {
        return "pageup";
      }
      return isCtrlPressed && !shiftKey ? "ctrl+up" : "up";
    }
    case "ArrowDown": {
      if (altKey && !isCtrlPressed && !shiftKey) {
        return "pagedown";
      }
      return isCtrlPressed && !shiftKey ? "ctrl+down" : "down";
    }
    case "ArrowLeft": {
      return isCtrlPressed && !shiftKey ? "home" : "left";
    }
    case "ArrowRight": {
      return isCtrlPressed && !shiftKey ? "end" : "right";
    }
    default: {
      return null;
    }
  }
};

const resolveNavigationDirection = (
  chord: KeyChord,
  isRtl: boolean,
): NavigationDirection | null => {
  const { key, altKey, shiftKey, isCtrlPressed } = chord;
  switch (key) {
    case "Home": {
      return isCtrlPressed ? "ctrl+home" : "home";
    }
    case "End": {
      return isCtrlPressed ? "ctrl+end" : "end";
    }
    case "PageUp": {
      return altKey ? "pageleft" : "pageup";
    }
    case "PageDown": {
      return altKey ? "pageright" : "pagedown";
    }
    case "Tab": {
      const forward = isRtl ? "left" : "right";
      const backward = isRtl ? "right" : "left";
      return shiftKey ? backward : forward;
    }
    default: {
      return resolveArrowDirection(chord);
    }
  }
};

const getKeyChord = (event: KeyboardEvent): KeyChord => ({
  altKey: event.altKey,
  isCtrlPressed: event.ctrlKey || event.metaKey,
  key: event.key,
  shiftKey: event.shiftKey,
});

/**
 * v9 models selection as `Record<string, true>`: a deselected row is an
 * absent key, not a `false` value.
 */
const setRowsSelected = (
  rowSelection: RowSelectionState,
  rowIds: string[],
  selected: boolean,
): RowSelectionState => {
  if (selected) {
    const next: RowSelectionState = { ...rowSelection };
    for (const id of rowIds) {
      next[id] = true;
    }
    return next;
  }
  const removed = new Set(rowIds);
  return Object.fromEntries(Object.entries(rowSelection).filter(([id]) => !removed.has(id)));
};

/**
 * TanStack's built-in sizing fallbacks. `column.columnDef` already carries the
 * merged feature and `defaultColumn` defaults, so these only apply to a def
 * that sets a size to `undefined` explicitly.
 */
const FALLBACK_COLUMN_SIZE = 150;
const FALLBACK_MIN_COLUMN_SIZE = 20;
const FALLBACK_MAX_COLUMN_SIZE = Number.MAX_SAFE_INTEGER;

/**
 * Mirrors `column.getSize()`. The instance getter reads the live sizing atom,
 * so a memo over it cannot name its input; deriving from the committed
 * `columnSizing` state gives the same number with a dependable dep.
 */
const getColumnSize = <TData extends DataGridRowData>(
  column: Column<DataGridFeatures, TData>,
  columnSizing: ColumnSizingState,
): number => {
  const { columnDef } = column;
  const size = columnSizing[column.id] ?? columnDef.size ?? FALLBACK_COLUMN_SIZE;
  return Math.min(
    Math.max(columnDef.minSize ?? FALLBACK_MIN_COLUMN_SIZE, size),
    columnDef.maxSize ?? FALLBACK_MAX_COLUMN_SIZE,
  );
};

const sumHeaderSize = <TData extends DataGridRowData>(
  header: Header<DataGridFeatures, TData>,
  columnSizing: ColumnSizingState,
): number => {
  if (header.subHeaders.length === 0) {
    return getColumnSize(header.column, columnSizing);
  }
  return header.subHeaders.reduce((sum, sub) => sum + sumHeaderSize(sub, columnSizing), 0);
};

const getColumnSizeVars = <TData extends DataGridRowData>(
  headers: Header<DataGridFeatures, TData>[],
  columnSizing: ColumnSizingState,
) => {
  const colSizes: Record<string, number> = {};
  for (const header of headers) {
    colSizes[`--header-${header.id}-size`] = sumHeaderSize(header, columnSizing);
    colSizes[`--col-${header.column.id}-size`] = getColumnSize(header.column, columnSizing);
  }
  return colSizes;
};

const useDataGrid = <TData extends DataGridRowData>({
  data,
  columns,
  rowHeight: rowHeightProp = DEFAULT_ROW_HEIGHT,
  overscan = OVERSCAN,
  dir: dirProp,
  initialState,
  ...props
}: UseDataGridProps<TData>) => {
  const contextDir = useDirection();
  const dir = dirProp ?? contextDir;

  const isFirefox = React.useSyncExternalStore(
    React.useCallback(
      () => () => {
        /* empty */
      },
      [],
    ),
    React.useCallback(() => {
      if (typeof window === "undefined" || typeof navigator === "undefined") {
        return false;
      }
      return navigator.userAgent.includes("Firefox");
    }, []),
    React.useCallback(() => false, []),
  );

  const dataGridRef = React.useRef<HTMLDivElement>(null);
  const tableRef = React.useRef<ReturnType<typeof useTable<DataGridFeatures, TData>>>(null);
  const rowVirtualizerRef = React.useRef<Virtualizer<HTMLDivElement, Element>>(null);
  const headerRef = React.useRef<HTMLDivElement>(null);
  const rowMapRef = React.useRef<Map<number, HTMLDivElement>>(new Map());
  const cellMapRef = React.useRef<Map<string, HTMLDivElement>>(new Map());
  const footerRef = React.useRef<HTMLDivElement>(null);
  const focusGuardRef = React.useRef(false);
  const visualRowIndexCacheRef = React.useRef<{
    rows: Row<DataGridFeatures, TData>[] | null;
    map: Map<string, number>;
  } | null>(null);

  const propsRef = useAsRef({
    ...props,
    columns,
    data,
    initialState,
  });

  // Seed the store once, on mount. Re-seeding on prop changes would clobber the
  // user's live sorting, filters, row height and selection with the initial
  // values, so the seed is captured in a ref rather than read from props.
  const initialStoreStateRef = useLazyRef(() => ({
    columnFilters: initialState?.columnFilters ?? [],
    rowHeight: rowHeightProp,
    rowSelection: initialState?.rowSelection ?? {},
    sorting: initialState?.sorting ?? [],
  }));

  React.useEffect(() => {
    useDataGridStore.getState().batch(initialStoreStateRef.current);
  }, [initialStoreStateRef]);

  // Store adapter wrapping Zustand with microtask-batched updates
  // This prevents multiple synchronous state changes from causing multiple re-renders
  const store = React.useMemo(() => {
    const zustandStore = useDataGridStore;
    let pendingUpdates: Partial<DataGridStore> = {};
    let isBatching = false;
    let pendingMicrotask = false;

    const flushUpdates = () => {
      pendingMicrotask = false;
      if (Object.keys(pendingUpdates).length > 0) {
        zustandStore.getState().batch({ ...pendingUpdates });
        pendingUpdates = {};
      }
    };

    const setStateImpl = <K extends keyof DataGridStore>(key: K, value: DataGridStore[K]) => {
      pendingUpdates[key] = value;

      // Flushed when the batch ends
      if (isBatching) {
        return;
      }

      // Schedule microtask to batch rapid updates
      if (!pendingMicrotask) {
        pendingMicrotask = true;
        queueMicrotask(flushUpdates);
      }
    };

    return {
      batch: (fn: () => void) => {
        isBatching = true;
        try {
          fn();
        } finally {
          isBatching = false;
          flushUpdates();
        }
      },
      getState: zustandStore.getState,
      setState: setStateImpl,
      subscribe: zustandStore.subscribe,
    };
  }, []);

  // Subscribe to Zustand store state with shallow comparison to minimize re-renders
  const {
    focusedCell,
    editingCell,
    selectionState,
    searchQuery,
    searchMatches,
    matchIndex,
    searchOpen,
    sorting,
    columnFilters,
    rowSelection,
    rowHeight,
    contextMenu,
    pasteDialog,
    generatingCells,
  } = useDataGridStore(
    useShallow((s) => ({
      columnFilters: s.columnFilters,
      contextMenu: s.contextMenu,
      editingCell: s.editingCell,
      focusedCell: s.focusedCell,
      generatingCells: s.generatingCells,
      matchIndex: s.matchIndex,
      pasteDialog: s.pasteDialog,
      rowHeight: s.rowHeight,
      rowSelection: s.rowSelection,
      searchMatches: s.searchMatches,
      searchOpen: s.searchOpen,
      searchQuery: s.searchQuery,
      selectionState: s.selectionState,
      sorting: s.sorting,
    })),
  );

  const rowHeightValue = getRowHeightValue(rowHeight);

  const prevCellSelectionMapRef = useLazyRef(() => new Map<number, Set<string>>());
  const { selectedCells } = selectionState;

  // Memoize per-row selection sets to prevent unnecessary row re-renders
  // Each row gets a stable Set reference that only changes when its cells' selection changes
  const cellSelectionMap = React.useMemo(() => {
    if (selectedCells.size === 0) {
      prevCellSelectionMapRef.current.clear();
      return null;
    }

    const newRowCells = new Map<number, Set<string>>();
    for (const cellKey of selectedCells) {
      const { rowIndex } = parseCellKey(cellKey);
      let rowSet = newRowCells.get(rowIndex);
      if (!rowSet) {
        rowSet = new Set<string>();
        newRowCells.set(rowIndex, rowSet);
      }
      rowSet.add(cellKey);
    }

    const stableMap = new Map<number, Set<string>>();
    for (const [rowIndex, newSet] of newRowCells) {
      const prevSet = prevCellSelectionMapRef.current.get(rowIndex);
      if (prevSet && prevSet.size === newSet.size && [...newSet].every((key) => prevSet.has(key))) {
        stableMap.set(rowIndex, prevSet);
      } else {
        stableMap.set(rowIndex, newSet);
      }
    }

    prevCellSelectionMapRef.current = stableMap;
    return stableMap;
  }, [selectedCells, prevCellSelectionMapRef]);

  const hasSelection = selectedCells.size > 0;

  const columnIds = React.useMemo(() => getColumnIds(columns), [columns]);

  const navigableColumnIds = React.useMemo(
    () => columnIds.filter((c) => !NON_NAVIGABLE_COLUMN_IDS.has(c)),
    [columnIds],
  );

  const onDataUpdate = React.useCallback(
    (updates: CellUpdate | CellUpdate[]) => {
      if (propsRef.current.readOnly) {
        return;
      }

      const updateArray = Array.isArray(updates) ? updates : [updates];

      if (updateArray.length === 0) {
        return;
      }

      const currentData = propsRef.current.data;
      const rows = tableRef.current?.getRowModel().rows;
      const rowUpdatesMap = groupUpdatesByRow(updateArray, rows, currentData);

      propsRef.current.onDataChange?.(applyRowUpdates(rowUpdatesMap, rows, currentData));
    },
    [propsRef],
  );

  const getIsCellSelected = React.useCallback(
    (rowIndex: number, columnId: string) => {
      const currentSelectionState = store.getState().selectionState;
      return currentSelectionState.selectedCells.has(getCellKey(rowIndex, columnId));
    },
    [store],
  );

  // Pre-compute visual row index map for O(1) lookups (used by select column)
  // Cache is invalidated when row model identity changes (sorting/filtering)
  const getVisualRowIndex = React.useCallback((rowId: string): number | undefined => {
    const rows = tableRef.current?.getRowModel().rows;
    if (!rows) {
      return undefined;
    }

    if (visualRowIndexCacheRef.current?.rows !== rows) {
      const map = new Map<string, number>();
      for (const [i, row] of rows.entries()) {
        map.set(row.id, i + 1);
      }
      visualRowIndexCacheRef.current = { map, rows };
    }

    return visualRowIndexCacheRef.current.map.get(rowId);
  }, []);

  const onSelectionClear = React.useCallback(() => {
    store.batch(() => {
      store.setState("selectionState", {
        isSelecting: false,
        selectedCells: new Set(),
        selectionRange: null,
      });
      store.setState("rowSelection", {});
    });
  }, [store]);

  const selectAll = React.useCallback(() => {
    const allCells = new Set<string>();
    const currentTable = tableRef.current;
    const rows = currentTable?.getRowModel().rows ?? [];
    const rowCount = rows.length ?? propsRef.current.data.length;

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      for (const columnId of columnIds) {
        allCells.add(getCellKey(rowIndex, columnId));
      }
    }

    const [firstColumnId] = columnIds;
    const lastColumnId = columnIds.at(-1);

    store.setState("selectionState", {
      isSelecting: false,
      selectedCells: allCells,
      selectionRange:
        columnIds.length > 0 && rowCount > 0 && firstColumnId && lastColumnId
          ? {
              end: { columnId: lastColumnId, rowIndex: rowCount - 1 },
              start: { columnId: firstColumnId, rowIndex: 0 },
            }
          : null,
    });
  }, [columnIds, propsRef, store]);

  const selectColumn = React.useCallback(
    (columnId: string) => {
      const currentTable = tableRef.current;
      const rows = currentTable?.getRowModel().rows ?? [];
      const rowCount = rows.length ?? propsRef.current.data.length;

      if (rowCount === 0) {
        return;
      }

      const columnCells = new Set<string>();

      for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
        columnCells.add(getCellKey(rowIndex, columnId));
      }

      store.setState("selectionState", {
        isSelecting: false,
        selectedCells: columnCells,
        selectionRange: {
          end: { columnId, rowIndex: rowCount - 1 },
          start: { columnId, rowIndex: 0 },
        },
      });
    },
    [propsRef, store],
  );

  const selectRange = React.useCallback(
    (start: CellPosition, end: CellPosition, isSelecting = false) => {
      const startColIndex = columnIds.indexOf(start.columnId);
      const endColIndex = columnIds.indexOf(end.columnId);

      const minRow = Math.min(start.rowIndex, end.rowIndex);
      const maxRow = Math.max(start.rowIndex, end.rowIndex);
      const minCol = Math.min(startColIndex, endColIndex);
      const maxCol = Math.max(startColIndex, endColIndex);

      const rangeCells = new Set<string>();

      for (let rowIndex = minRow; rowIndex <= maxRow; rowIndex += 1) {
        for (let colIndex = minCol; colIndex <= maxCol; colIndex += 1) {
          const columnId = columnIds[colIndex];
          if (columnId) {
            rangeCells.add(getCellKey(rowIndex, columnId));
          }
        }
      }

      store.setState("selectionState", {
        isSelecting,
        selectedCells: rangeCells,
        selectionRange: { end, start },
      });
    },
    [columnIds, store],
  );

  const onCellsCopy = React.useCallback(async () => {
    const selectedCellsArray = getSelectedCellKeys(store.getState());
    const rows = tableRef.current?.getRowModel().rows;
    if (!selectedCellsArray || !rows) {
      return;
    }

    const tsvData = buildTsv(selectedCellsArray, rows);

    try {
      await navigator.clipboard.writeText(tsvData);

      const currentState = store.getState();
      if (currentState.cutCells.size > 0) {
        store.setState("cutCells", new Set());
      }

      toast.success(
        `${selectedCellsArray.length} cell${selectedCellsArray.length === 1 ? "" : "s"} copied`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to copy to clipboard");
    }
  }, [store]);

  const onCellsCut = React.useCallback(async () => {
    if (propsRef.current.readOnly) {
      return;
    }

    const selectedCellsArray = getSelectedCellKeys(store.getState());
    const rows = tableRef.current?.getRowModel().rows;
    if (!selectedCellsArray || !rows) {
      return;
    }

    const tsvData = buildTsv(selectedCellsArray, rows);

    try {
      await navigator.clipboard.writeText(tsvData);

      store.setState("cutCells", new Set(selectedCellsArray));

      toast.success(
        `${selectedCellsArray.length} cell${selectedCellsArray.length === 1 ? "" : "s"} cut`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cut to clipboard");
    }
  }, [store, propsRef]);

  const restoreFocus = React.useCallback((element: HTMLDivElement | null) => {
    if (element && document.activeElement !== element) {
      requestAnimationFrame(() => {
        element.focus();
      });
    }
  }, []);

  const addRowsForPaste = React.useCallback(
    async (rowsNeeded: number, expectedRowCount: number) => {
      if (propsRef.current.onRowsAdd) {
        await propsRef.current.onRowsAdd(rowsNeeded);
      } else if (propsRef.current.onRowAdd) {
        for (let i = 0; i < rowsNeeded; i += 1) {
          await propsRef.current.onRowAdd();
        }
      }

      const maxAttempts = 50;
      let attempts = 0;
      while (
        (tableRef.current?.getRowModel().rows.length ?? 0) < expectedRowCount &&
        attempts < maxAttempts
      ) {
        await sleep(100);
        attempts += 1;
      }
    },
    [propsRef],
  );

  const applyPasteUpdates = React.useCallback(
    async (
      updates: CellUpdate[],
      tableColumns: Column<DataGridFeatures, TData>[],
      cutCells: Set<string>,
    ) => {
      if (propsRef.current.onPaste) {
        await propsRef.current.onPaste(updates);
      }

      const allUpdates = [...updates];
      if (cutCells.size > 0) {
        allUpdates.push(...getClearUpdates(cutCells, tableColumns));
        store.setState("cutCells", new Set());
      }

      onDataUpdate(allUpdates);
    },
    [propsRef, store, onDataUpdate],
  );

  const onCellsPaste = React.useCallback(
    async (expandRows = false) => {
      if (propsRef.current.readOnly) {
        return;
      }

      const currentState = store.getState();
      if (!currentState.focusedCell) {
        return;
      }

      const currentTable = tableRef.current;
      if (!currentTable) {
        return;
      }

      try {
        const clipboardText =
          currentState.pasteDialog.clipboardText || (await navigator.clipboard.readText());
        if (!clipboardText) {
          return;
        }

        const pastedData = parseTsv(clipboardText);
        const startRowIndex = currentState.focusedCell.rowIndex;
        const startColIndex = navigableColumnIds.indexOf(currentState.focusedCell.columnId);
        if (startColIndex === -1) {
          return;
        }

        const rowCount = currentTable.getRowModel().rows.length;
        const rowsNeeded = startRowIndex + pastedData.length - rowCount;

        if (
          shouldPromptForRows({
            canAddRows: Boolean(propsRef.current.onRowAdd),
            expandRows,
            hasDialogText: Boolean(currentState.pasteDialog.clipboardText),
            rowsNeeded,
          })
        ) {
          store.setState("pasteDialog", {
            clipboardText,
            open: true,
            rowsNeeded,
          });
          return;
        }

        if (expandRows && rowsNeeded > 0) {
          await addRowsForPaste(rowsNeeded, rowCount + rowsNeeded);
        }

        const tableColumns = currentTable.getAllColumns();
        const { updates, cellsSkipped, endRowIndex, endColIndex } = collectPasteUpdates(
          pastedData,
          {
            columnMap: new Map(tableColumns.map((c) => [c.id, c])),
            navigableColumnIds,
            rowCount: tableRef.current?.getRowModel().rows.length ?? 0,
            startColIndex,
            startRowIndex,
          },
        );

        if (updates.length > 0) {
          await applyPasteUpdates(updates, tableColumns, currentState.cutCells);

          const endColumnId = navigableColumnIds[endColIndex];
          if (endColumnId) {
            selectRange(
              {
                columnId: currentState.focusedCell.columnId,
                rowIndex: startRowIndex,
              },
              { columnId: endColumnId, rowIndex: endRowIndex },
            );
          }

          restoreFocus(dataGridRef.current);
        }

        toastPasteResult(updates.length, cellsSkipped);

        if (currentState.pasteDialog.open) {
          store.setState("pasteDialog", {
            clipboardText: "",
            open: false,
            rowsNeeded: 0,
          });
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to paste. Please try again.");
      }
    },
    [
      store,
      navigableColumnIds,
      propsRef,
      addRowsForPaste,
      applyPasteUpdates,
      selectRange,
      restoreFocus,
    ],
  );

  // Release focus guard after delay to allow async data re-renders to settle.
  // 300ms accounts for db sync and virtualized cell mounting.
  const releaseFocusGuard = React.useCallback((immediate = false) => {
    if (immediate) {
      focusGuardRef.current = false;
      return;
    }

    setTimeout(() => {
      focusGuardRef.current = false;
    }, 300);
  }, []);

  const focusCellWrapper = React.useCallback(
    (rowIndex: number, columnId: string) => {
      focusGuardRef.current = true;

      requestAnimationFrame(() => {
        const cellKey = getCellKey(rowIndex, columnId);
        const cellWrapperElement = cellMapRef.current.get(cellKey);

        if (!cellWrapperElement) {
          const container = dataGridRef.current;
          if (container) {
            container.focus();
          }
          releaseFocusGuard();
          return;
        }

        cellWrapperElement.focus();
        releaseFocusGuard();
      });
    },
    [releaseFocusGuard],
  );

  const focusCell = React.useCallback(
    (rowIndex: number, columnId: string) => {
      store.batch(() => {
        store.setState("focusedCell", { columnId, rowIndex });
        store.setState("editingCell", null);
      });

      const currentState = store.getState();

      if (currentState.searchOpen) {
        return;
      }

      focusCellWrapper(rowIndex, columnId);
    },
    [store, focusCellWrapper],
  );

  const onRowsDelete = React.useCallback(
    async (rowIndices: number[]) => {
      if (propsRef.current.readOnly || !propsRef.current.onRowsDelete || rowIndices.length === 0) {
        return;
      }

      const currentTable = tableRef.current;
      const rows = currentTable?.getRowModel().rows;

      if (!rows || rows.length === 0) {
        return;
      }

      const currentState = store.getState();
      const currentFocusedColumn = currentState.focusedCell?.columnId ?? navigableColumnIds[0];

      const minDeletedRowIndex = Math.min(...rowIndices);

      const rowsToDelete: TData[] = [];
      for (const rowIndex of rowIndices) {
        const row = rows[rowIndex];
        if (row) {
          rowsToDelete.push(row.original);
        }
      }

      await propsRef.current.onRowsDelete(rowsToDelete, rowIndices);

      store.batch(() => {
        store.setState("selectionState", {
          isSelecting: false,
          selectedCells: new Set(),
          selectionRange: null,
        });
        store.setState("rowSelection", {});
        store.setState("editingCell", null);
      });

      requestAnimationFrame(() => {
        const newRowCount = tableRef.current?.getRowModel().rows.length ?? 0;

        if (newRowCount > 0 && currentFocusedColumn) {
          const targetRowIndex = Math.min(minDeletedRowIndex, newRowCount - 1);
          focusCell(targetRowIndex, currentFocusedColumn);
        }
      });
    },
    [propsRef, store, navigableColumnIds, focusCell],
  );

  const scrollToUnrenderedRow = React.useCallback(
    (
      direction: NavigationDirection,
      target: CellPosition,
      columnChanged: boolean,
      container: HTMLDivElement,
    ) => {
      const virtualizer = rowVirtualizerRef.current;
      if (!virtualizer) {
        // Fallback: use direct scroll calculation when virtualizer is not available
        container.scrollTop = target.rowIndex * getRowHeightValue(rowHeight);
        return;
      }

      virtualizer.scrollToIndex(target.rowIndex, { align: getScrollAlign(direction) });

      if (!columnChanged) {
        return;
      }

      // Wait for row to render before horizontal scroll
      requestAnimationFrame(() => {
        const targetCell = cellMapRef.current.get(getCellKey(target.rowIndex, target.columnId));
        if (targetCell) {
          scrollCellIntoView({
            container,
            direction: getScrollDirection(direction),
            isRtl: dir === "rtl",
            tableRef,
            targetCell,
            viewportOffset: VIEWPORT_OFFSET,
          });
        }
      });
    },
    [dir, rowHeight],
  );

  const navigateCell = React.useCallback(
    (direction: NavigationDirection) => {
      const currentState = store.getState();
      if (!currentState.focusedCell) {
        return;
      }

      const { rowIndex, columnId } = currentState.focusedCell;
      const virtualizer = rowVirtualizerRef.current;
      const rowCount = tableRef.current?.getRowModel().rows.length ?? 0;
      const pageSize = virtualizer ? virtualizer.getVirtualItems().length : 10;

      const newRowIndex = resolveNavigationRow(direction, rowIndex, { pageSize, rowCount });
      const newColumnId = resolveNavigationColumn(
        direction,
        columnId,
        navigableColumnIds,
        dir === "rtl",
      );

      if (newRowIndex === rowIndex && newColumnId === columnId) {
        return;
      }

      focusCell(newRowIndex, newColumnId);

      // Calculate and apply scrolls synchronously to avoid flashing
      const container = dataGridRef.current;
      if (!container) {
        return;
      }

      const targetRow = rowMapRef.current.get(newRowIndex);
      const columnChanged = newColumnId !== columnId;

      // If target row is not rendered, scroll it into view first
      if (!targetRow) {
        scrollToUnrenderedRow(
          direction,
          { columnId: newColumnId, rowIndex: newRowIndex },
          columnChanged,
          container,
        );
        return;
      }

      if (newRowIndex !== rowIndex) {
        requestAnimationFrame(() => {
          scrollRowIntoView(container, targetRow, direction, headerRef.current, footerRef.current);
        });
      }

      const targetCell = cellMapRef.current.get(getCellKey(newRowIndex, newColumnId));
      if (columnChanged && targetCell) {
        requestAnimationFrame(() => {
          scrollCellIntoView({
            container,
            direction: getScrollDirection(direction),
            isRtl: dir === "rtl",
            tableRef,
            targetCell,
            viewportOffset: VIEWPORT_OFFSET,
          });
        });
      }
    },
    [dir, store, navigableColumnIds, focusCell, scrollToUnrenderedRow],
  );

  const onCellEditingStart = React.useCallback(
    (rowIndex: number, columnId: string) => {
      if (propsRef.current.readOnly) {
        return;
      }

      store.batch(() => {
        store.setState("focusedCell", { columnId, rowIndex });
        store.setState("editingCell", { columnId, rowIndex });
      });
    },
    [store, propsRef],
  );

  const onCellEditingStop = React.useCallback(
    (opts?: { moveToNextRow?: boolean; direction?: NavigationDirection }) => {
      const currentState = store.getState();
      const currentEditing = currentState.editingCell;

      store.setState("editingCell", null);

      if (opts?.moveToNextRow && currentEditing) {
        const { rowIndex, columnId } = currentEditing;
        const currentTable = tableRef.current;
        const rows = currentTable?.getRowModel().rows ?? [];
        const rowCount = rows.length ?? propsRef.current.data.length;

        const nextRowIndex = rowIndex + 1;
        if (nextRowIndex < rowCount) {
          requestAnimationFrame(() => {
            focusCell(nextRowIndex, columnId);
          });
        }
      } else if (opts?.direction && currentEditing) {
        const { rowIndex, columnId } = currentEditing;
        focusCell(rowIndex, columnId);
        requestAnimationFrame(() => {
          navigateCell(opts.direction ?? "right");
        });
      } else if (currentEditing) {
        const { rowIndex, columnId } = currentEditing;
        focusCellWrapper(rowIndex, columnId);
      }
    },
    [store, propsRef, focusCell, navigateCell, focusCellWrapper],
  );

  const onSearchOpenChange = React.useCallback(
    (open: boolean) => {
      if (open) {
        store.setState("searchOpen", true);
        return;
      }

      const currentState = store.getState();
      const currentMatch =
        currentState.matchIndex >= 0 && currentState.searchMatches[currentState.matchIndex];

      store.batch(() => {
        store.setState("searchOpen", false);
        store.setState("searchQuery", "");
        store.setState("searchMatches", []);
        store.setState("matchIndex", -1);

        if (currentMatch) {
          store.setState("focusedCell", {
            columnId: currentMatch.columnId,
            rowIndex: currentMatch.rowIndex,
          });
        }
      });

      if (dataGridRef.current && document.activeElement !== dataGridRef.current) {
        dataGridRef.current.focus();
      }
    },
    [store],
  );

  const onSearch = React.useCallback(
    (query: string) => {
      if (!query.trim()) {
        store.batch(() => {
          store.setState("searchMatches", []);
          store.setState("matchIndex", -1);
        });
        return;
      }

      const matches: CellPosition[] = [];
      const currentTable = tableRef.current;
      const rows = currentTable?.getRowModel().rows ?? [];

      const lowerQuery = query.toLowerCase();

      for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
        const row = rows[rowIndex];
        if (!row) {
          continue;
        }

        for (const columnId of columnIds) {
          const cell = row.getVisibleCells().find((c) => c.column.id === columnId);
          if (!cell) {
            continue;
          }

          const value = cell.getValue();
          const stringValue = String(value ?? "").toLowerCase();

          if (stringValue.includes(lowerQuery)) {
            matches.push({ columnId, rowIndex });
          }
        }
      }

      store.batch(() => {
        store.setState("searchMatches", matches);
        store.setState("matchIndex", matches.length > 0 ? 0 : -1);
      });

      const [firstMatch] = matches;
      if (firstMatch) {
        rowVirtualizerRef.current?.scrollToIndex(firstMatch.rowIndex, {
          align: "center",
        });
      }
    },
    [columnIds, store],
  );

  const onSearchQueryChange = React.useCallback(
    (query: string) => store.setState("searchQuery", query),
    [store],
  );

  const onNavigateToPrevMatch = React.useCallback(() => {
    const currentState = store.getState();
    if (currentState.searchMatches.length === 0) {
      return;
    }

    const prevIndex =
      currentState.matchIndex - 1 < 0
        ? currentState.searchMatches.length - 1
        : currentState.matchIndex - 1;
    const match = currentState.searchMatches[prevIndex];

    if (match) {
      rowVirtualizerRef.current?.scrollToIndex(match.rowIndex, {
        align: "center",
      });

      requestAnimationFrame(() => {
        store.setState("matchIndex", prevIndex);
        requestAnimationFrame(() => {
          focusCell(match.rowIndex, match.columnId);
        });
      });
    }
  }, [store, focusCell]);

  const onNavigateToNextMatch = React.useCallback(() => {
    const currentState = store.getState();
    if (currentState.searchMatches.length === 0) {
      return;
    }

    const nextIndex = (currentState.matchIndex + 1) % currentState.searchMatches.length;
    const match = currentState.searchMatches[nextIndex];

    if (match) {
      rowVirtualizerRef.current?.scrollToIndex(match.rowIndex, {
        align: "center",
      });

      requestAnimationFrame(() => {
        store.setState("matchIndex", nextIndex);
        requestAnimationFrame(() => {
          focusCell(match.rowIndex, match.columnId);
        });
      });
    }
  }, [store, focusCell]);

  const getIsSearchMatch = React.useCallback(
    (rowIndex: number, columnId: string) => {
      const currentSearchMatches = store.getState().searchMatches;
      return currentSearchMatches.some(
        (match) => match.rowIndex === rowIndex && match.columnId === columnId,
      );
    },
    [store],
  );

  const getIsActiveSearchMatch = React.useCallback(
    (rowIndex: number, columnId: string) => {
      const currentState = store.getState();
      if (currentState.matchIndex < 0) {
        return false;
      }
      const currentMatch = currentState.searchMatches[currentState.matchIndex];
      return currentMatch?.rowIndex === rowIndex && currentMatch?.columnId === columnId;
    },
    [store],
  );

  // Compute search match data for targeted row re-renders
  // Maps rowIndex -> Set of columnIds that have matches in that row
  const searchMatchesByRow = React.useMemo(() => {
    if (searchMatches.length === 0) {
      return null;
    }
    const rowMap = new Map<number, Set<string>>();
    for (const match of searchMatches) {
      let columnSet = rowMap.get(match.rowIndex);
      if (!columnSet) {
        columnSet = new Set<string>();
        rowMap.set(match.rowIndex, columnSet);
      }
      columnSet.add(match.columnId);
    }
    return rowMap;
  }, [searchMatches]);

  const activeSearchMatch = React.useMemo<CellPosition | null>(() => {
    if (matchIndex < 0 || searchMatches.length === 0) {
      return null;
    }
    return searchMatches[matchIndex] ?? null;
  }, [searchMatches, matchIndex]);

  const blurCell = React.useCallback(() => {
    const currentState = store.getState();
    if (currentState.editingCell && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    store.batch(() => {
      store.setState("focusedCell", null);
      store.setState("editingCell", null);
    });
  }, [store]);

  const onCellClick = React.useCallback(
    (rowIndex: number, columnId: string, event?: React.MouseEvent) => {
      if (event?.button === 2) {
        return;
      }

      const currentState = store.getState();
      const currentFocused = currentState.focusedCell;

      const scrollToCell = () => {
        requestAnimationFrame(() => {
          const container = dataGridRef.current;
          const cellKey = getCellKey(rowIndex, columnId);
          const targetCell = cellMapRef.current.get(cellKey);

          if (container && targetCell) {
            scrollCellIntoView({
              container,
              isRtl: dir === "rtl",
              tableRef,
              targetCell,
              viewportOffset: VIEWPORT_OFFSET,
            });
          }
        });
      };

      if (event) {
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          const cellKey = getCellKey(rowIndex, columnId);
          const newSelectedCells = new Set(currentState.selectionState.selectedCells);

          if (newSelectedCells.has(cellKey)) {
            newSelectedCells.delete(cellKey);
          } else {
            newSelectedCells.add(cellKey);
          }

          store.setState("selectionState", {
            isSelecting: false,
            selectedCells: newSelectedCells,
            selectionRange: null,
          });
          focusCell(rowIndex, columnId);
          scrollToCell();
          return;
        }

        if (event.shiftKey && currentState.focusedCell) {
          event.preventDefault();
          selectRange(currentState.focusedCell, { columnId, rowIndex });
          scrollToCell();
          return;
        }
      }

      const hasSelectedCells = currentState.selectionState.selectedCells.size > 0;
      const hasSelectedRows = Object.keys(currentState.rowSelection).length > 0;

      if (hasSelectedCells && !currentState.selectionState.isSelecting) {
        const cellKey = getCellKey(rowIndex, columnId);
        const isClickingSelectedCell = currentState.selectionState.selectedCells.has(cellKey);

        if (isClickingSelectedCell) {
          focusCell(rowIndex, columnId);
          scrollToCell();
          return;
        }
        onSelectionClear();
      } else if (hasSelectedRows && columnId !== "select") {
        onSelectionClear();
      }

      if (currentFocused?.rowIndex === rowIndex && currentFocused?.columnId === columnId) {
        onCellEditingStart(rowIndex, columnId);
      } else {
        focusCell(rowIndex, columnId);
        scrollToCell();
      }
    },
    [store, focusCell, onCellEditingStart, selectRange, onSelectionClear, dir],
  );

  const onCellDoubleClick = React.useCallback(
    (rowIndex: number, columnId: string, event?: React.MouseEvent) => {
      if (event?.defaultPrevented) {
        return;
      }

      onCellEditingStart(rowIndex, columnId);
    },
    [onCellEditingStart],
  );

  const onCellMouseDown = React.useCallback(
    (rowIndex: number, columnId: string, event: React.MouseEvent) => {
      if (event.button === 2) {
        return;
      }

      event.preventDefault();

      if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
        const cellKey = getCellKey(rowIndex, columnId);
        store.batch(() => {
          store.setState("selectionState", {
            isSelecting: true,
            selectedCells: propsRef.current.enableSingleCellSelection
              ? new Set([cellKey])
              : new Set(),
            selectionRange: {
              end: { columnId, rowIndex },
              start: { columnId, rowIndex },
            },
          });
          store.setState("editingCell", null);
          store.setState("rowSelection", {});
        });
      }
    },
    [store, propsRef],
  );

  const onCellMouseEnter = React.useCallback(
    (rowIndex: number, columnId: string) => {
      const currentState = store.getState();
      if (currentState.selectionState.isSelecting && currentState.selectionState.selectionRange) {
        const { start } = currentState.selectionState.selectionRange;
        const end = { columnId, rowIndex };

        if (
          currentState.focusedCell?.rowIndex !== start.rowIndex ||
          currentState.focusedCell?.columnId !== start.columnId
        ) {
          focusCell(start.rowIndex, start.columnId);
        }

        selectRange(start, end, true);
      }
    },
    [store, selectRange, focusCell],
  );

  const onCellMouseUp = React.useCallback(() => {
    const currentState = store.getState();
    store.setState("selectionState", {
      ...currentState.selectionState,
      isSelecting: false,
    });
  }, [store]);

  const onCellContextMenu = React.useCallback(
    (rowIndex: number, columnId: string, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const currentState = store.getState();
      const cellKey = getCellKey(rowIndex, columnId);
      const isTargetCellSelected = currentState.selectionState.selectedCells.has(cellKey);

      if (!isTargetCellSelected) {
        store.batch(() => {
          store.setState("selectionState", {
            isSelecting: false,
            selectedCells: new Set([cellKey]),
            selectionRange: {
              end: { columnId, rowIndex },
              start: { columnId, rowIndex },
            },
          });
          store.setState("focusedCell", { columnId, rowIndex });
        });
      }

      store.setState("contextMenu", {
        open: true,
        x: event.clientX,
        y: event.clientY,
      });
    },
    [store],
  );

  const onContextMenuOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        const currentMenu = store.getState().contextMenu;
        store.setState("contextMenu", {
          open: false,
          x: currentMenu.x,
          y: currentMenu.y,
        });
      }
    },
    [store],
  );

  const onSortingChange = React.useCallback(
    (updater: Updater<SortingState>) => {
      const currentState = store.getState();
      const newSorting = functionalUpdate(updater, currentState.sorting);
      store.setState("sorting", newSorting);

      propsRef.current.onSortingChange?.(newSorting);
    },
    [store, propsRef],
  );

  const onColumnFiltersChange = React.useCallback(
    (updater: Updater<ColumnFiltersState>) => {
      const currentState = store.getState();
      const newColumnFilters = functionalUpdate(updater, currentState.columnFilters);
      store.setState("columnFilters", newColumnFilters);

      propsRef.current.onColumnFiltersChange?.(newColumnFilters);
    },
    [store, propsRef],
  );

  const onRowSelectionChange = React.useCallback(
    (updater: Updater<RowSelectionState>) => {
      const currentState = store.getState();
      const newRowSelection = functionalUpdate(updater, currentState.rowSelection);

      const selectedRows = Object.keys(newRowSelection).filter((key) => newRowSelection[key]);

      const rowCells = new Set<string>();
      const rows = tableRef.current?.getRowModel().rows ?? [];

      for (const rowId of selectedRows) {
        const rowIndex = rows.findIndex((r) => r.id === rowId);
        if (rowIndex === -1) {
          continue;
        }

        for (const columnId of columnIds) {
          rowCells.add(getCellKey(rowIndex, columnId));
        }
      }

      store.batch(() => {
        store.setState("rowSelection", newRowSelection);
        store.setState("selectionState", {
          isSelecting: false,
          selectedCells: rowCells,
          selectionRange: null,
        });
        store.setState("focusedCell", null);
        store.setState("editingCell", null);
      });
    },
    [store, columnIds],
  );

  const onRowSelect = React.useCallback(
    (rowIndex: number, selected: boolean, shiftKey: boolean) => {
      const currentState = store.getState();
      const rows = tableRef.current?.getRowModel().rows ?? [];
      const currentRow = rows[rowIndex];
      if (!currentRow) {
        return;
      }

      const { lastClickedRowIndex } = currentState;
      const rowsToToggle =
        shiftKey && lastClickedRowIndex !== null
          ? rows.slice(
              Math.min(lastClickedRowIndex, rowIndex),
              Math.max(lastClickedRowIndex, rowIndex) + 1,
            )
          : [currentRow];

      onRowSelectionChange(
        setRowsSelected(
          currentState.rowSelection,
          rowsToToggle.map((row) => row.id),
          selected,
        ),
      );

      store.setState("lastClickedRowIndex", rowIndex);
    },
    [store, onRowSelectionChange],
  );

  const onRowHeightChange = React.useCallback(
    (updater: Updater<RowHeightValue>) => {
      const currentState = store.getState();
      const newRowHeight = functionalUpdate(updater, currentState.rowHeight);
      store.setState("rowHeight", newRowHeight);
      propsRef.current.onRowHeightChange?.(newRowHeight);
    },
    [store, propsRef],
  );

  const onColumnClick = React.useCallback(
    (columnId: string) => {
      if (!propsRef.current.enableColumnSelection) {
        onSelectionClear();
        return;
      }

      selectColumn(columnId);
    },
    [propsRef, selectColumn, onSelectionClear],
  );

  const onPasteDialogOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        store.setState("pasteDialog", {
          clipboardText: "",
          open: false,
          rowsNeeded: 0,
        });
      }
    },
    [store],
  );

  const defaultColumn: Partial<ColumnDef<DataGridFeatures, TData>> = React.useMemo(
    () => ({
      // Note: cell is rendered directly in DataGridRow to bypass flexRender's
      // unstable cell.getContext() (see TanStack Table issue #4794)
      maxSize: MAX_COLUMN_SIZE,
      minSize: MIN_COLUMN_SIZE,
    }),
    [],
  );

  const tableMeta = React.useMemo<TableMeta<DataGridFeatures, TData>>(
    () => ({
      ...propsRef.current.meta,
      cellMapRef,
      // Use getters for frequently changing state values to avoid recreating meta
      get contextMenu() {
        return store.getState().contextMenu;
      },
      dataGridRef,
      get editingCell() {
        return store.getState().editingCell;
      },
      get focusedCell() {
        return store.getState().focusedCell;
      },
      getIsActiveSearchMatch,
      getIsCellSelected,
      getIsSearchMatch,
      getVisualRowIndex,
      onCellClick,
      onCellContextMenu,
      onCellDoubleClick,
      onCellEditingStart,
      onCellEditingStop,
      onCellMouseDown,
      onCellMouseEnter,
      onCellMouseUp,
      onCellsCopy,
      onCellsCut,
      onCellsPaste,
      onColumnAdd: propsRef.current.onColumnAdd,
      onColumnClick,
      onColumnDelete: propsRef.current.onColumnDelete,
      onColumnUpdate: propsRef.current.onColumnUpdate,
      onContextMenuOpenChange,
      onDataUpdate,
      onEnrichColumn: propsRef.current.onEnrichColumn,
      onFilesDelete: propsRef.current.onFilesDelete || undefined,
      onFilesUpload: propsRef.current.onFilesUpload || undefined,
      onPasteDialogOpenChange,
      onRowHeightChange,
      onRowSelect,
      onRowsDelete: propsRef.current.onRowsDelete ? onRowsDelete : undefined,
      onSelectionClear,
      get pasteDialog() {
        return store.getState().pasteDialog;
      },
      get readOnly() {
        return propsRef.current.readOnly;
      },
      get rowHeight() {
        return store.getState().rowHeight;
      },
      get searchOpen() {
        return store.getState().searchOpen;
      },
      get selectionState() {
        return store.getState().selectionState;
      },
    }),
    [
      propsRef,
      store,
      getIsCellSelected,
      getVisualRowIndex,
      getIsSearchMatch,
      getIsActiveSearchMatch,
      onRowHeightChange,
      onRowSelect,
      onDataUpdate,
      onRowsDelete,
      onColumnClick,
      onCellClick,
      onCellDoubleClick,
      onCellMouseDown,
      onCellMouseEnter,
      onCellMouseUp,
      onCellContextMenu,
      onCellEditingStart,
      onCellEditingStop,
      onCellsCopy,
      onCellsCut,
      onCellsPaste,
      onSelectionClear,
      onContextMenuOpenChange,
      onPasteDialogOpenChange,
    ],
  );

  // Memoize state object to reduce shallow equality checks
  const tableState = React.useMemo<Partial<TableState<DataGridFeatures>>>(
    () => ({
      ...propsRef.current.state,
      columnFilters,
      rowSelection,
      sorting,
    }),
    [propsRef, sorting, columnFilters, rowSelection],
  );

  const tableOptions = React.useMemo<TableOptions<DataGridFeatures, TData>>(
    () => ({
      ...propsRef.current,
      columnResizeDirection: dir,
      columnResizeMode: "onChange",
      columns,
      data,
      defaultColumn,
      features: dataGridFeatures,
      initialState: propsRef.current.initialState,
      meta: tableMeta,
      onColumnFiltersChange,
      onRowSelectionChange,
      onSortingChange,
      state: tableState,
    }),
    [
      propsRef,
      data,
      columns,
      defaultColumn,
      tableState,
      dir,
      onRowSelectionChange,
      onSortingChange,
      onColumnFiltersChange,
      tableMeta,
    ],
  );

  const table = useTable(tableOptions);

  if (!tableRef.current) {
    tableRef.current = table;
  }

  const headers = table.getFlatHeaders();
  const { columnSizing, columnPinning } = table.state;
  const columnSizeVars = React.useMemo(
    () => getColumnSizeVars(headers, columnSizing),
    [headers, columnSizing],
  );

  const adjustLayout = React.useMemo(
    () =>
      isFirefox && ((columnPinning.start?.length ?? 0) > 0 || (columnPinning.end?.length ?? 0) > 0),
    [isFirefox, columnPinning],
  );

  // oxlint-disable-next-line react/incompatible-library -- React Compiler is not enabled in this repo; the virtualizer's getters are read each render on purpose
  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    estimateSize: () => rowHeightValue,
    getScrollElement: () => dataGridRef.current,
    measureElement: isFirefox ? undefined : (element) => element?.getBoundingClientRect().height,
    overscan,
  });

  if (!rowVirtualizerRef.current) {
    rowVirtualizerRef.current = rowVirtualizer;
  }

  const onScrollToRow = React.useCallback(
    async (opts: Partial<CellPosition>) => {
      const rowIndex = opts?.rowIndex ?? 0;
      const columnId = opts?.columnId;

      focusGuardRef.current = true;

      const navigableIds = getColumnIds(propsRef.current.columns).filter(
        (c) => !NON_NAVIGABLE_COLUMN_IDS.has(c),
      );

      const targetColumnId = columnId ?? navigableIds.find(Boolean);

      if (!targetColumnId) {
        releaseFocusGuard(true);
        return;
      }

      const onScrollAndFocus = async (retryCount: number): Promise<void> => {
        if (!targetColumnId) {
          return;
        }
        const currentRowCount = propsRef.current.data.length;

        // If the requested row doesn't exist yet, wait for data to update
        if (rowIndex >= currentRowCount && retryCount > 0) {
          await sleep(50);
          await onScrollAndFocus(retryCount - 1);
          return;
        }

        const safeRowIndex = Math.min(rowIndex, Math.max(0, currentRowCount - 1));

        const isBottomHalf = safeRowIndex > currentRowCount / 2;
        rowVirtualizer.scrollToIndex(safeRowIndex, {
          align: isBottomHalf ? "end" : "start",
        });

        await nextFrame();

        // Adjust scroll position to account for sticky header/footer
        const container = dataGridRef.current;
        const targetRow = rowMapRef.current.get(safeRowIndex);

        if (container && targetRow) {
          const { top: viewportTop, bottom: viewportBottom } = getViewportBounds(
            container,
            headerRef.current,
            footerRef.current,
          );

          const rowRect = targetRow.getBoundingClientRect();
          const isFullyVisible = rowRect.top >= viewportTop && rowRect.bottom <= viewportBottom;

          if (!isFullyVisible) {
            if (rowRect.top < viewportTop) {
              // Row is partially hidden by header - scroll up
              container.scrollTop -= viewportTop - rowRect.top;
            } else if (rowRect.bottom > viewportBottom) {
              // Row is partially hidden by footer - scroll down
              container.scrollTop += rowRect.bottom - viewportBottom;
            }
          }
        }

        store.batch(() => {
          store.setState("focusedCell", {
            columnId: targetColumnId,
            rowIndex: safeRowIndex,
          });
          store.setState("editingCell", null);
        });

        const cellKey = getCellKey(safeRowIndex, targetColumnId);
        const cellElement = cellMapRef.current.get(cellKey);

        if (cellElement) {
          cellElement.focus();
          releaseFocusGuard();
        } else if (retryCount > 0) {
          await nextFrame();
          await onScrollAndFocus(retryCount - 1);
        } else {
          dataGridRef.current?.focus();
          releaseFocusGuard();
        }
      };

      await onScrollAndFocus(SCROLL_SYNC_RETRY_COUNT);
    },
    [rowVirtualizer, propsRef, store, releaseFocusGuard],
  );

  const onRowAdd = React.useCallback(
    async (event?: React.MouseEvent<HTMLDivElement>) => {
      if (propsRef.current.readOnly || !propsRef.current.onRowAdd) {
        return;
      }

      const initialRowCount = propsRef.current.data.length;

      let result: Partial<CellPosition> | null;
      try {
        result = await propsRef.current.onRowAdd(event);
      } catch {
        // Callback threw an error, don't proceed with scroll/focus
        return;
      }

      if (result === null || event?.defaultPrevented) {
        return;
      }

      onSelectionClear();

      // Trust the returned rowIndex from the callback
      // onScrollToRow will handle retries if the row isn't rendered yet
      const targetRowIndex = result.rowIndex ?? initialRowCount;
      const targetColumnId = result.columnId;

      onScrollToRow({
        columnId: targetColumnId,
        rowIndex: targetRowIndex,
      });
    },
    [propsRef, onScrollToRow, onSelectionClear],
  );

  const onSearchKeyDown = React.useCallback(
    (event: KeyboardEvent, currentState: DataGridStore): boolean => {
      if (!propsRef.current.enableSearch) {
        return false;
      }

      const { key, shiftKey, isCtrlPressed } = getKeyChord(event);

      if (isCtrlPressed && !shiftKey && key === SEARCH_SHORTCUT_KEY) {
        event.preventDefault();
        onSearchOpenChange(true);
        return true;
      }

      if (!currentState.searchOpen || currentState.editingCell) {
        return false;
      }

      if (key === "Enter") {
        event.preventDefault();
        if (shiftKey) {
          onNavigateToPrevMatch();
        } else {
          onNavigateToNextMatch();
        }
      } else if (key === "Escape") {
        event.preventDefault();
        onSearchOpenChange(false);
      }
      return true;
    },
    [propsRef, onSearchOpenChange, onNavigateToPrevMatch, onNavigateToNextMatch],
  );

  const onRowDeleteKeyDown = React.useCallback(
    (event: KeyboardEvent, currentState: DataGridStore): boolean => {
      const { key, isCtrlPressed } = getKeyChord(event);
      const isDeleteKey = key === "Backspace" || key === "Delete";

      if (
        !isCtrlPressed ||
        !isDeleteKey ||
        propsRef.current.readOnly ||
        !propsRef.current.onRowsDelete
      ) {
        return false;
      }

      const rowIndices = getRowIndicesToDelete(
        currentState,
        tableRef.current?.getRowModel().rows ?? [],
      );

      if (rowIndices.length > 0) {
        event.preventDefault();
        onRowsDelete(rowIndices);
      }
      return true;
    },
    [propsRef, onRowsDelete],
  );

  const getClipboardAction = React.useCallback(
    (key: string): (() => void) | null => {
      switch (key) {
        case "a": {
          return selectAll;
        }
        case "c": {
          return onCellsCopy;
        }
        case "x": {
          return propsRef.current.readOnly ? null : onCellsCut;
        }
        case "v": {
          return propsRef.current.enablePaste && !propsRef.current.readOnly ? onCellsPaste : null;
        }
        default: {
          return null;
        }
      }
    },
    [propsRef, selectAll, onCellsCopy, onCellsCut, onCellsPaste],
  );

  const onClipboardKeyDown = React.useCallback(
    (event: KeyboardEvent): boolean => {
      const { key, shiftKey, isCtrlPressed } = getKeyChord(event);
      if (!isCtrlPressed || shiftKey) {
        return false;
      }

      const action = getClipboardAction(key);
      if (!action) {
        return false;
      }

      event.preventDefault();
      action();
      return true;
    },
    [getClipboardAction],
  );

  const onClearCellsKeyDown = React.useCallback(
    (event: KeyboardEvent, currentState: DataGridStore): boolean => {
      const { key, isCtrlPressed } = getKeyChord(event);
      const isDeleteKey = key === "Delete" || key === "Backspace";

      if (!isDeleteKey || isCtrlPressed || propsRef.current.readOnly) {
        return false;
      }

      const cellsToClear = getSelectedCellKeys(currentState) ?? [];
      if (cellsToClear.length > 0) {
        event.preventDefault();

        const tableColumns = tableRef.current?.getAllColumns() ?? [];
        onDataUpdate(getClearUpdates(cellsToClear, tableColumns));

        if (currentState.selectionState.selectedCells.size > 0) {
          onSelectionClear();
        }

        if (currentState.cutCells.size > 0) {
          store.setState("cutCells", new Set());
        }
      }
      return true;
    },
    [propsRef, store, onDataUpdate, onSelectionClear],
  );

  const addRowFromKeyboard = React.useCallback(
    async (currentColumnId: string) => {
      const { onRowAdd: addRow } = propsRef.current;
      if (!addRow) {
        return;
      }

      const initialRowCount = propsRef.current.data.length;

      try {
        const result = await addRow();
        if (result === null) {
          return;
        }

        onSelectionClear();

        onScrollToRow({
          columnId: result.columnId ?? currentColumnId,
          rowIndex: result.rowIndex ?? initialRowCount,
        });
      } catch {
        // Callback threw an error, don't proceed with scroll/focus
      }
    },
    [propsRef, onSelectionClear, onScrollToRow],
  );

  const onAddRowKeyDown = React.useCallback(
    (event: KeyboardEvent, activeCell: CellPosition): boolean => {
      const { key, shiftKey } = getKeyChord(event);
      if (key !== "Enter" || !shiftKey || propsRef.current.readOnly || !propsRef.current.onRowAdd) {
        return false;
      }

      event.preventDefault();
      addRowFromKeyboard(activeCell.columnId);
      return true;
    },
    [propsRef, addRowFromKeyboard],
  );

  const extendSelectionToRow = React.useCallback(
    (
      rowIndex: number,
      align: "start" | "end",
      selectionStart: CellPosition,
      selectionEdge: CellPosition,
    ) => {
      selectRange(selectionStart, { columnId: selectionEdge.columnId, rowIndex });
      rowVirtualizerRef.current?.scrollToIndex(rowIndex, { align });
      restoreFocus(dataGridRef.current);
    },
    [selectRange, restoreFocus],
  );

  const extendSelectionToColumn = React.useCallback(
    (
      targetColumnId: string | undefined,
      direction: "home" | "end",
      selectionStart: CellPosition,
      selectionEdge: CellPosition,
    ) => {
      if (!targetColumnId) {
        return;
      }

      selectRange(selectionStart, {
        columnId: targetColumnId,
        rowIndex: selectionEdge.rowIndex,
      });

      const container = dataGridRef.current;
      const targetCell = cellMapRef.current.get(getCellKey(selectionEdge.rowIndex, targetColumnId));
      if (container && targetCell) {
        scrollCellIntoView({
          container,
          direction,
          isRtl: dir === "rtl",
          tableRef,
          targetCell,
          viewportOffset: VIEWPORT_OFFSET,
        });
      }

      restoreFocus(container);
    },
    [dir, selectRange, restoreFocus],
  );

  const onExtendToEdgeKeyDown = React.useCallback(
    (event: KeyboardEvent, currentState: DataGridStore, activeCell: CellPosition): boolean => {
      const { key, shiftKey, isCtrlPressed } = getKeyChord(event);
      if (!isCtrlPressed || !shiftKey) {
        return false;
      }

      const selectionEdge = currentState.selectionState.selectionRange?.end || activeCell;
      const selectionStart = currentState.selectionState.selectionRange?.start || activeCell;
      const isRtl = dir === "rtl";

      switch (key) {
        case "ArrowUp": {
          extendSelectionToRow(0, "start", selectionStart, selectionEdge);
          break;
        }
        case "ArrowDown": {
          const rowCount =
            tableRef.current?.getRowModel().rows.length || propsRef.current.data.length;
          extendSelectionToRow(Math.max(0, rowCount - 1), "end", selectionStart, selectionEdge);
          break;
        }
        case "ArrowLeft": {
          const targetColumnId = isRtl ? navigableColumnIds.at(-1) : navigableColumnIds[0];
          extendSelectionToColumn(targetColumnId, "home", selectionStart, selectionEdge);
          break;
        }
        case "ArrowRight": {
          const targetColumnId = isRtl ? navigableColumnIds[0] : navigableColumnIds.at(-1);
          extendSelectionToColumn(targetColumnId, "end", selectionStart, selectionEdge);
          break;
        }
        default: {
          return false;
        }
      }

      event.preventDefault();
      return true;
    },
    [dir, propsRef, navigableColumnIds, extendSelectionToRow, extendSelectionToColumn],
  );

  const scrollSelectionEdgeRow = React.useCallback(
    (rowIndex: number, direction: "up" | "down") => {
      const container = dataGridRef.current;
      const targetRow = rowMapRef.current.get(rowIndex);

      if (!container || !targetRow) {
        const virtualizer = rowVirtualizerRef.current;
        if (virtualizer) {
          virtualizer.scrollToIndex(rowIndex, { align: direction === "up" ? "start" : "end" });
          restoreFocus(container);
        }
        return;
      }

      if (
        scrollRowIntoView(container, targetRow, direction, headerRef.current, footerRef.current)
      ) {
        restoreFocus(container);
      }
    },
    [restoreFocus],
  );

  const extendSelectionByStep = React.useCallback(
    (direction: NavigationDirection, currentState: DataGridStore, activeCell: CellPosition) => {
      const selectionEdge = currentState.selectionState.selectionRange?.end || activeCell;
      const selectionStart = currentState.selectionState.selectionRange?.start || activeCell;
      const rowCount = tableRef.current?.getRowModel().rows.length || propsRef.current.data.length;

      const target = stepSelectionEdge(
        direction,
        selectionEdge,
        navigableColumnIds,
        rowCount,
        dir === "rtl",
      );

      selectRange(selectionStart, target);

      if (
        target.rowIndex !== selectionEdge.rowIndex &&
        (direction === "up" || direction === "down")
      ) {
        scrollSelectionEdgeRow(target.rowIndex, direction);
      }

      const container = dataGridRef.current;
      const targetCell = cellMapRef.current.get(getCellKey(target.rowIndex, target.columnId));
      if (
        target.columnId !== selectionEdge.columnId &&
        HORIZONTAL_STEP_DIRECTIONS.has(direction) &&
        container &&
        targetCell
      ) {
        scrollCellIntoView({
          container,
          direction: getScrollDirection(direction),
          isRtl: dir === "rtl",
          tableRef,
          targetCell,
          viewportOffset: VIEWPORT_OFFSET,
        });
      }
    },
    [dir, propsRef, navigableColumnIds, selectRange, scrollSelectionEdgeRow],
  );

  const onDataGridKeyDown = React.useCallback(
    (event: KeyboardEvent) => {
      const currentState = store.getState();

      if (onSearchKeyDown(event, currentState)) {
        return;
      }

      // Cell editing keyboard events (Enter, Tab, Escape) are handled by the cell variants
      // to ensure proper value commitment before navigation
      if (currentState.editingCell) {
        return;
      }

      if (onRowDeleteKeyDown(event, currentState)) {
        return;
      }

      const { focusedCell: activeCell } = currentState;
      if (!activeCell) {
        return;
      }

      if (
        onClipboardKeyDown(event) ||
        onClearCellsKeyDown(event, currentState) ||
        onAddRowKeyDown(event, activeCell) ||
        onExtendToEdgeKeyDown(event, currentState, activeCell)
      ) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        if (hasAnySelection(currentState)) {
          onSelectionClear();
        } else {
          blurCell();
        }
        return;
      }

      const direction = resolveNavigationDirection(getKeyChord(event), dir === "rtl");
      if (!direction) {
        return;
      }

      event.preventDefault();

      if (event.shiftKey && event.key !== "Tab") {
        extendSelectionByStep(direction, currentState, activeCell);
        return;
      }

      if (currentState.selectionState.selectedCells.size > 0) {
        onSelectionClear();
      }
      navigateCell(direction);
    },
    [
      dir,
      store,
      blurCell,
      navigateCell,
      onSelectionClear,
      onSearchKeyDown,
      onRowDeleteKeyDown,
      onClipboardKeyDown,
      onClearCellsKeyDown,
      onAddRowKeyDown,
      onExtendToEdgeKeyDown,
      extendSelectionByStep,
    ],
  );

  const searchState = React.useMemo<SearchState | undefined>(() => {
    if (!propsRef.current.enableSearch) {
      return;
    }

    return {
      matchIndex,
      onNavigateToNextMatch,
      onNavigateToPrevMatch,
      onSearch,
      onSearchOpenChange,
      onSearchQueryChange,
      searchMatches,
      searchOpen,
      searchQuery,
    };
  }, [
    propsRef,
    searchMatches,
    matchIndex,
    searchOpen,
    onSearchOpenChange,
    searchQuery,
    onSearchQueryChange,
    onSearch,
    onNavigateToNextMatch,
    onNavigateToPrevMatch,
  ]);

  React.useEffect(() => {
    const dataGridElement = dataGridRef.current;
    if (!dataGridElement) {
      return;
    }

    dataGridElement.addEventListener("keydown", onDataGridKeyDown);
    return () => {
      dataGridElement.removeEventListener("keydown", onDataGridKeyDown);
    };
  }, [onDataGridKeyDown]);

  React.useEffect(() => {
    const onGlobalKeyDown = (event: KeyboardEvent) => {
      const dataGridElement = dataGridRef.current;
      if (!dataGridElement) {
        return;
      }

      const { target } = event;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const { key, ctrlKey, metaKey, shiftKey } = event;
      const isCommandPressed = ctrlKey || metaKey;

      if (
        propsRef.current.enableSearch &&
        isCommandPressed &&
        !shiftKey &&
        key === SEARCH_SHORTCUT_KEY
      ) {
        const isInInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
        const isInDataGrid = dataGridElement.contains(target);
        const isInSearchInput = target.closest('[role="search"]') !== null;

        if (isInDataGrid || isInSearchInput || !isInInput) {
          event.preventDefault();
          event.stopPropagation();

          const nextSearchOpen = !store.getState().searchOpen;
          onSearchOpenChange(nextSearchOpen);

          if (nextSearchOpen && !isInDataGrid && !isInSearchInput) {
            requestAnimationFrame(() => {
              dataGridElement.focus();
            });
          }
          return;
        }
      }

      const isInDataGrid = dataGridElement.contains(target);
      if (!isInDataGrid) {
        return;
      }

      if (key === "Escape") {
        const currentState = store.getState();
        const hasSelections =
          currentState.selectionState.selectedCells.size > 0 ||
          Object.keys(currentState.rowSelection).length > 0;

        if (hasSelections) {
          event.preventDefault();
          event.stopPropagation();
          onSelectionClear();
        }
      }
    };

    window.addEventListener("keydown", onGlobalKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onGlobalKeyDown, true);
    };
  }, [propsRef, onSearchOpenChange, store, onSelectionClear]);

  React.useEffect(() => {
    const currentState = store.getState();
    const { autoFocus } = propsRef.current;

    if (
      autoFocus &&
      data.length > 0 &&
      columns.length > 0 &&
      !currentState.focusedCell &&
      navigableColumnIds.length > 0
    ) {
      const rafId = requestAnimationFrame(() => {
        if (autoFocus !== true) {
          const { rowIndex, columnId } = autoFocus;
          if (columnId) {
            focusCell(rowIndex ?? 0, columnId);
          }
          return;
        }

        const [firstColumnId] = navigableColumnIds;
        if (firstColumnId) {
          focusCell(0, firstColumnId);
        }
      });
      return () => cancelAnimationFrame(rafId);
    }
  }, [store, propsRef, data, columns, navigableColumnIds, focusCell]);

  // Restore focus to container when virtualized cells are unmounted
  React.useEffect(() => {
    const container = dataGridRef.current;
    if (!container) {
      return;
    }

    const onFocusOut = (event: FocusEvent) => {
      if (focusGuardRef.current) {
        return;
      }

      const currentContainer = dataGridRef.current;
      if (!currentContainer) {
        return;
      }

      const currentState = store.getState();

      if (!currentState.focusedCell || currentState.editingCell) {
        return;
      }

      const { relatedTarget } = event;

      const isFocusMovingOutsideGrid =
        !(relatedTarget instanceof Node) || !currentContainer.contains(relatedTarget);

      const isFocusMovingToPopover = getIsInPopover(relatedTarget);

      if (isFocusMovingOutsideGrid && !isFocusMovingToPopover) {
        const { rowIndex, columnId } = currentState.focusedCell;
        const cellKey = getCellKey(rowIndex, columnId);
        const cellElement = cellMapRef.current.get(cellKey);

        requestAnimationFrame(() => {
          if (focusGuardRef.current) {
            return;
          }

          if (cellElement && document.body.contains(cellElement)) {
            cellElement.focus();
          } else {
            currentContainer.focus();
          }
        });
      }
    };

    container.addEventListener("focusout", onFocusOut);

    return () => {
      container.removeEventListener("focusout", onFocusOut);
    };
  }, [store]);

  React.useEffect(() => {
    const onOutsideClick = (event: MouseEvent) => {
      if (event.button === 2) {
        return;
      }

      if (
        dataGridRef.current &&
        event.target instanceof Node &&
        !dataGridRef.current.contains(event.target)
      ) {
        const elements = document.elementsFromPoint(event.clientX, event.clientY);

        // Compensate for event.target bubbling up
        const isInsidePopover = elements.some((element) => getIsInPopover(element));

        if (!isInsidePopover) {
          blurCell();
          const currentState = store.getState();
          if (
            currentState.selectionState.selectedCells.size > 0 ||
            Object.keys(currentState.rowSelection).length > 0
          ) {
            onSelectionClear();
          }
        }
      }
    };

    document.addEventListener("mousedown", onOutsideClick);
    return () => {
      document.removeEventListener("mousedown", onOutsideClick);
    };
  }, [store, blurCell, onSelectionClear]);

  React.useEffect(() => {
    const onSelectStart = (event: Event) => {
      event.preventDefault();
    };

    const onContextMenu = (event: Event) => {
      event.preventDefault();
    };

    const onCleanup = () => {
      document.removeEventListener("selectstart", onSelectStart);
      document.removeEventListener("contextmenu", onContextMenu);
      document.body.style.userSelect = "";
    };

    const onUnsubscribe = store.subscribe(() => {
      const currentState = store.getState();
      if (currentState.selectionState.isSelecting) {
        document.addEventListener("selectstart", onSelectStart);
        document.addEventListener("contextmenu", onContextMenu);
        document.body.style.userSelect = "none";
      } else {
        onCleanup();
      }
    });

    return () => {
      onCleanup();
      onUnsubscribe();
    };
  }, [store]);

  useIsomorphicLayoutEffect(() => {
    const rafId = requestAnimationFrame(() => {
      rowVirtualizer.measure();
    });
    return () => cancelAnimationFrame(rafId);
  }, [
    rowHeight,
    table.state.columnFilters,
    table.state.columnPinning,
    table.state.columnSizing,
    table.state.columnVisibility,
    table.state.rowSelection,
    table.state.sorting,
  ]);

  // Calculate virtual values outside of child render to avoid flushSync issues
  const virtualTotalSize = rowVirtualizer.getTotalSize();
  const virtualItems = rowVirtualizer.getVirtualItems();
  const { measureElement } = rowVirtualizer;

  return React.useMemo(
    () => ({
      activeSearchMatch,
      adjustLayout,
      cellSelectionMap,
      columnSizeVars,
      columns,
      contextMenu,
      dataGridRef,
      dir,
      editingCell,
      focusedCell,
      footerRef,
      generatingCells,
      hasSelection,
      headerRef,
      measureElement,
      onRowAdd: propsRef.current.onRowAdd ? onRowAdd : undefined,
      pasteDialog,
      rowHeight,
      rowMapRef,
      searchMatchesByRow,
      searchState,
      table,
      tableMeta,
      virtualItems,
      virtualTotalSize,
    }),
    [
      propsRef,
      dir,
      table,
      tableMeta,
      virtualTotalSize,
      virtualItems,
      measureElement,
      columns,
      columnSizeVars,
      searchState,
      searchMatchesByRow,
      activeSearchMatch,
      cellSelectionMap,
      hasSelection,
      focusedCell,
      editingCell,
      rowHeight,
      contextMenu,
      pasteDialog,
      adjustLayout,
      onRowAdd,
      generatingCells,
    ],
  );
};

export {
  useDataGrid,
  //
  type UseDataGridProps,
};
