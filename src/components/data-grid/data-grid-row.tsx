"use client";

/* oxlint-disable jsx-a11y/prefer-tag-over-role -- WAI-ARIA grid on a virtualized div layout; table elements can't be absolutely positioned per row */
import type {
  RowData,
  ColumnDef,
  ColumnPinningState,
  Row,
  TableMeta,
  ColumnVisibilityState,
} from "@tanstack/react-table";
import type { DataGridFeatures } from "@/lib/data-grid-features";
import type { VirtualItem } from "@tanstack/react-virtual";
import * as React from "react";
import { DataGridCell } from "@/components/data-grid/data-grid-cell";
import { useComposedRefs } from "@/components/ui/utils";
import {
  flexRender,
  getCellKey,
  getColumnBorderVisibility,
  getColumnPinningStyle,
  getRowHeightValue,
} from "@/lib/data-grid";
import { cn } from "cn";
import type {
  CellPosition,
  DataGridRowData,
  Direction,
  RowHeightValue,
} from "@/lib/data-grid-types";
import { genericMemo } from "@/lib/generic-memo";
import { isFunction } from "@/lib/is-function";

const cellPositionChanged = (
  prev: CellPosition | null,
  next: CellPosition | null,
  prevRowIndex: number,
  nextRowIndex: number,
) => {
  const prevInRow = prev?.rowIndex === prevRowIndex;
  const nextInRow = next?.rowIndex === nextRowIndex;
  if (prevInRow !== nextInRow) {
    return true;
  }
  return nextInRow && prevInRow && prev?.columnId !== next?.columnId;
};

interface DataGridRowProps<TData extends RowData> extends React.ComponentProps<"div"> {
  row: Row<DataGridFeatures, TData>;
  tableMeta: TableMeta<DataGridFeatures, TData>;
  virtualItem: VirtualItem;
  measureElement: (node: Element | null) => void;
  rowMapRef: React.RefObject<Map<number, HTMLDivElement>>;
  rowHeight: RowHeightValue;
  columns: readonly ColumnDef<DataGridFeatures, TData>[];
  columnVisibility: ColumnVisibilityState;
  columnPinning: ColumnPinningState;
  focusedCell: CellPosition | null;
  editingCell: CellPosition | null;
  cellSelectionKeys: Set<string>;
  searchMatchColumns: Set<string> | null;
  activeSearchMatch: CellPosition | null;
  dir: Direction;
  readOnly: boolean;
  stretchColumns: boolean;
  adjustLayout: boolean;
  generatingCells: Set<string>;
}

const DataGridRowImpl = <TData extends DataGridRowData>({
  row,
  tableMeta,
  virtualItem,
  measureElement,
  rowMapRef,
  rowHeight,
  columns: _columns,
  columnVisibility: _columnVisibility,
  columnPinning: _columnPinning,
  focusedCell,
  editingCell,
  cellSelectionKeys,
  searchMatchColumns,
  activeSearchMatch,
  dir,
  readOnly,
  stretchColumns,
  adjustLayout,
  generatingCells,
  className,
  style,
  ref,
  ...props
}: DataGridRowProps<TData>) => {
  const virtualRowIndex = virtualItem.index;

  const onRowChange = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        measureElement(node);
        rowMapRef.current?.set(virtualRowIndex, node);
      } else {
        rowMapRef.current?.delete(virtualRowIndex);
      }
    },
    [virtualRowIndex, measureElement, rowMapRef],
  );

  const rowRef = useComposedRefs(ref, onRowChange);

  const isRowSelected = row.getIsSelected();

  // TanStack memoizes getVisibleCells() on visibility/pinning/columns itself; the
  // unused props exist so the memo comparator re-renders the row when they change.
  const visibleCells = row.getVisibleCells();

  return (
    <div
      key={row.id}
      role="row"
      aria-rowindex={virtualRowIndex + 2}
      aria-selected={isRowSelected}
      data-index={virtualRowIndex}
      data-slot="grid-row"
      tabIndex={-1}
      {...props}
      ref={rowRef}
      className={cn(
        "absolute flex w-full border-b",
        !adjustLayout && "will-change-transform",
        className,
      )}
      style={{
        height: `${getRowHeightValue(rowHeight)}px`,
        ...(adjustLayout
          ? { top: `${virtualItem.start}px` }
          : { transform: `translateY(${virtualItem.start}px)` }),
        ...style,
      }}
    >
      {visibleCells.map((cell, colIndex) => {
        const columnId = cell.column.id;

        const isCellFocused =
          focusedCell?.rowIndex === virtualRowIndex && focusedCell?.columnId === columnId;
        const isCellEditing =
          editingCell?.rowIndex === virtualRowIndex && editingCell?.columnId === columnId;
        const isCellSelected =
          cellSelectionKeys?.has(getCellKey(virtualRowIndex, columnId)) ?? false;

        const isSearchMatch = searchMatchColumns?.has(columnId) ?? false;
        const isActiveSearchMatch = activeSearchMatch?.columnId === columnId;
        const isGenerating = generatingCells.has(getCellKey(virtualRowIndex, columnId));

        const nextCell = visibleCells[colIndex + 1];
        const isLastColumn = colIndex === visibleCells.length - 1;
        const { showEndBorder, showStartBorder } = getColumnBorderVisibility({
          column: cell.column,
          isLastColumn,
          nextColumn: nextCell?.column,
        });

        return (
          <div
            key={cell.id}
            role="gridcell"
            aria-colindex={colIndex + 1}
            data-highlighted={isCellFocused ? "" : undefined}
            data-slot="grid-cell"
            tabIndex={-1}
            className={cn({
              "border-e": showEndBorder && columnId !== "select",
              "border-s": showStartBorder && columnId !== "select",
              grow: stretchColumns && columnId !== "select",
            })}
            style={{
              ...getColumnPinningStyle({ column: cell.column, dir }),
              width: `calc(var(--col-${columnId}-size) * 1px)`,
            }}
          >
            {isFunction(cell.column.columnDef.header) ? (
              <div
                className={cn("size-full px-3 py-1.5", {
                  "bg-primary/10": isRowSelected,
                })}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </div>
            ) : (
              <DataGridCell
                cell={cell}
                tableMeta={tableMeta}
                rowIndex={virtualRowIndex}
                columnId={columnId}
                rowHeight={rowHeight}
                isFocused={isCellFocused}
                isEditing={isCellEditing}
                isSelected={isCellSelected}
                isSearchMatch={isSearchMatch}
                isActiveSearchMatch={isActiveSearchMatch}
                isGenerating={isGenerating}
                readOnly={readOnly}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
export const DataGridRow = genericMemo(DataGridRowImpl, (prev, next) => {
  const prevRowIndex = prev.virtualItem.index;
  const nextRowIndex = next.virtualItem.index;

  // Re-render if row identity changed
  if (prev.row.id !== next.row.id) {
    return false;
  }

  // Re-render if row data (original) reference changed
  if (prev.row.original !== next.row.original) {
    return false;
  }

  // Re-render if virtual position changed (handles transform updates)
  if (prev.virtualItem.start !== next.virtualItem.start) {
    return false;
  }

  // Re-render if focus or editing moved into, out of, or within this row
  if (cellPositionChanged(prev.focusedCell, next.focusedCell, prevRowIndex, nextRowIndex)) {
    return false;
  }
  if (cellPositionChanged(prev.editingCell, next.editingCell, prevRowIndex, nextRowIndex)) {
    return false;
  }

  // Re-render if this row's selected cells changed
  // Using stable Set reference that only includes this row's cells
  if (prev.cellSelectionKeys !== next.cellSelectionKeys) {
    return false;
  }

  // Re-render if column visibility changed
  if (prev.columnVisibility !== next.columnVisibility) {
    return false;
  }

  // Re-render if row height changed
  if (prev.rowHeight !== next.rowHeight) {
    return false;
  }

  // Re-render if column pinning state changed
  if (prev.columnPinning !== next.columnPinning) {
    return false;
  }

  // Re-render if readOnly changed
  if (prev.readOnly !== next.readOnly) {
    return false;
  }

  // Re-render if search match columns changed for this row
  if (prev.searchMatchColumns !== next.searchMatchColumns) {
    return false;
  }

  // Re-render if active search match changed for this row
  if (prev.activeSearchMatch?.columnId !== next.activeSearchMatch?.columnId) {
    return false;
  }

  // Re-render if adjustLayout changed
  if (prev.adjustLayout !== next.adjustLayout) {
    return false;
  }

  // Re-render if direction changed
  if (prev.dir !== next.dir) {
    return false;
  }

  // Re-render if stretchColumns changed
  if (prev.stretchColumns !== next.stretchColumns) {
    return false;
  }

  // Re-render if generatingCells changed (reference check)
  if (prev.generatingCells !== next.generatingCells) {
    return false;
  }

  // Re-render if columns changed (handles column metadata updates like options)
  if (prev.columns !== next.columns) {
    return false;
  }

  // Skip re-render - props are equal
  return true;
});
