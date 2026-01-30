"use client";

import type { ColumnDef } from "@tanstack/react-table";
import * as React from "react";
import { DataGrid } from "@/components/data-grid/data-grid";
import { getDataGridAddColumn } from "@/components/data-grid/data-grid-add-column";
import { DataGridFilterMenu } from "@/components/data-grid/data-grid-filter-menu";
import { DataGridKeyboardShortcuts } from "@/components/data-grid/data-grid-keyboard-shortcuts";
import { DataGridRowHeightMenu } from "@/components/data-grid/data-grid-row-height-menu";
import { DataGridSortMenu } from "@/components/data-grid/data-grid-sort-menu";
import { DataGridViewMenu } from "@/components/data-grid/data-grid-view-menu";
import { useDataGrid } from "@/hooks/use-data-grid";
import { useWindowSize } from "@/hooks/use-window-size";
import { Chat } from "@/components/chat/chat";
import type { CellOpts, CellSelectOption, CellUpdate } from "@/lib/data-grid-types";
import type { ColumnUpdate } from "@/ai/messages/data-parts";
import type { SelectionContext } from "@/lib/selection-context";
import { parseCellKey } from "@/lib/data-grid";

/** Creates a CellOpts config for a given variant */
function createCellConfig(variant: CellOpts["variant"]): CellOpts {
  switch (variant) {
    case "select":
      return { variant: "select", options: [] };
    case "multi-select":
      return { variant: "multi-select", options: [] };
    case "number":
      return { variant: "number" };
    case "file":
      return { variant: "file" };
    case "long-text":
      return { variant: "long-text" };
    case "checkbox":
      return { variant: "checkbox" };
    case "date":
      return { variant: "date" };
    case "url":
      return { variant: "url" };
    case "short-text":
    default:
      return { variant: "short-text" };
  }
}

export interface DataGridContainerProps<T> {
  initialData: T[];
  initialColumns: ColumnDef<T>[];
  getRowId: (row: T, index: number) => string;
  createNewRow: () => T;
  createNewRows: (count: number) => T[];
  pinnedColumns: string[];
  defaultColumnId: string;
  initialChatInput?: string;
}

export function DataGridContainer<T>({
  initialData,
  initialColumns,
  getRowId,
  createNewRow,
  createNewRows,
  pinnedColumns,
  defaultColumnId,
  initialChatInput,
}: DataGridContainerProps<T>) {
  const windowSize = useWindowSize({ defaultHeight: 760 });
  const [data, setData] = React.useState<T[]>(initialData);
  const [columns, setColumns] = React.useState<ColumnDef<T>[]>(initialColumns);

  const onColumnUpdate = React.useCallback(
    (
      columnId: string,
      updates: Partial<{ label: string; variant: CellOpts["variant"]; prompt: string; options: CellSelectOption[] }>
    ) => {
      setColumns((prev) =>
        prev.map((col): ColumnDef<T> => {
          if (col.id !== columnId) return col;

          const currentMeta = col.meta ?? {};
          const currentCell = currentMeta.cell ?? { variant: "short-text" as const };

          // If variant is changing, create new cell config; otherwise keep current
          let newCell: CellOpts =
            updates.variant && updates.variant !== currentCell.variant
              ? createCellConfig(updates.variant)
              : currentCell;

          // If options are provided and this is a select type, update them
          if (updates.options !== undefined) {
            const cellVariant = newCell.variant;
            if (cellVariant === "select" || cellVariant === "multi-select") {
              newCell = {
                ...newCell,
                options: updates.options,
              } as CellOpts;
            }
          }

          return {
            ...col,
            header: updates.label ?? col.header,
            meta: {
              ...currentMeta,
              label: updates.label ?? currentMeta.label,
              cell: newCell,
              prompt: updates.prompt ?? currentMeta.prompt,
            },
          } as ColumnDef<T>;
        })
      );
    },
    []
  );

  const onColumnDelete = React.useCallback((columnId: string) => {
    setColumns((prev) => prev.filter((col) => col.id !== columnId));
  }, []);

  const onColumnAdd = React.useCallback(
    (addConfig: {
      label: string;
      variant: CellOpts["variant"];
      prompt: string;
      options?: CellSelectOption[];
      insertAfterColumnId?: string;
    }) => {
      const newId = `column_${Date.now()}`;

      // Create cell config with options if provided for select types
      let cellConfig = createCellConfig(addConfig.variant);
      if (
        addConfig.options &&
        (addConfig.variant === "select" || addConfig.variant === "multi-select")
      ) {
        cellConfig = { ...cellConfig, options: addConfig.options } as CellOpts;
      }

      const newColumn: ColumnDef<T> = {
        id: newId,
        accessorKey: newId,
        header: addConfig.label,
        meta: {
          label: addConfig.label,
          cell: cellConfig,
          prompt: addConfig.prompt || undefined,
        },
      };

      setColumns((prev) => {
        if (!addConfig.insertAfterColumnId) return [...prev, newColumn];
        const idx = prev.findIndex((col) => col.id === addConfig.insertAfterColumnId);
        if (idx === -1) return [...prev, newColumn];
        const result = [...prev];
        result.splice(idx + 1, 0, newColumn);
        return result;
      });
    },
    []
  );

  const effectiveColumns = React.useMemo(
    () => [...columns, getDataGridAddColumn<T>()],
    [columns]
  );

  const { table, tableMeta, hasSelection, ...dataGridProps } = useDataGrid<T>({
    data,
    onDataChange: setData,
    columns: effectiveColumns,
    getRowId,
    onRowAdd: () => {
      setData((prev) => [...prev, createNewRow()]);
      return { rowIndex: data.length, columnId: defaultColumnId };
    },
    onRowsAdd: (count) => {
      setData((prev) => [...prev, ...createNewRows(count)]);
    },
    onRowsDelete: (rows) => {
      setData((prev) => prev.filter((row) => !rows.includes(row)));
    },
    onFilesUpload: async ({ files }) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return files.map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
      }));
    },
    onFilesDelete: async () => {
      // TODO: implement actual file deletion
    },
    onColumnUpdate,
    onColumnDelete,
    onColumnAdd,
    onEnrichColumn: () => {
      // TODO: implement column enrichment
    },
    initialState: {
      columnPinning: {
        left: pinnedColumns,
        right: ["add-column"],
      },
    },
    enableSearch: true,
    enablePaste: true,
  });

  const onColumnsGenerated = React.useCallback(
    (newColumns: ColumnDef<unknown>[]) => {
      // Get IDs of existing non-system columns
      const existingIds = new Set(
        columns
          .filter((col) => col.id !== "select" && col.id !== "index" && col.id !== "add-column")
          .map((col) => col.id)
      );

      // Filter out new columns that would duplicate existing ones
      const columnsToAdd = newColumns.filter((col) => !existingIds.has(col.id));
      const newColumnIds = columnsToAdd.map((col) => col.id).filter(Boolean) as string[];

      // Add new columns
      setColumns((prev) => [...prev, ...columnsToAdd] as ColumnDef<T>[]);

      // Initialize new column properties in existing data rows
      if (newColumnIds.length > 0) {
        setData((prev) =>
          prev.map((row) => {
            const updates: Record<string, unknown> = {};
            for (const colId of newColumnIds) {
              if (!(colId in (row as Record<string, unknown>))) {
                updates[colId] = undefined;
              }
            }
            return Object.keys(updates).length > 0 ? { ...row, ...updates } : row;
          })
        );
      }
    },
    [columns]
  );

  const onDataEnriched = React.useCallback(
    (updates: CellUpdate[]) => {
      setData((prev) => {
        const newData = [...prev];
        for (const update of updates) {
          if (update.rowIndex < 0 || update.rowIndex > newData.length) continue;
          if (!columns.find((col) => col.id === update.columnId)) continue;

          while (newData.length <= update.rowIndex) {
            newData.push({} as T);
          }
          const row = newData[update.rowIndex];
          if (row) {
            newData[update.rowIndex] = { ...row, [update.columnId]: update.value } as T;
          }
        }
        return newData;
      });
    },
    [columns]
  );

  const onColumnsUpdated = React.useCallback(
    (updates: ColumnUpdate[]) => {
      for (const update of updates) {
        onColumnUpdate(update.columnId, {
          label: update.label,
          variant: update.variant as CellOpts["variant"],
          prompt: update.prompt,
        });
        // Handle options update for select/multi-select
        if (update.options) {
          setColumns((prev) =>
            prev.map((col): ColumnDef<T> => {
              if (col.id !== update.columnId) return col;
              const currentMeta = col.meta ?? {};
              const currentCell = currentMeta.cell as { variant: string; options?: Array<{ label: string; value: string }> } | undefined;
              if (currentCell && (currentCell.variant === "select" || currentCell.variant === "multi-select")) {
                return {
                  ...col,
                  meta: {
                    ...currentMeta,
                    cell: {
                      ...currentCell,
                      options: update.options,
                    },
                  },
                } as ColumnDef<T>;
              }
              return col;
            })
          );
        }
      }
    },
    [onColumnUpdate]
  );

  const onColumnsDeleted = React.useCallback(
    (columnIds: string[]) => {
      for (const columnId of columnIds) {
        onColumnDelete(columnId);
      }
    },
    [onColumnDelete]
  );

  const getExistingColumns = React.useCallback(() => {
    return columns
      .filter((col) => col.id && col.id !== "select" && col.id !== "index" && col.id !== "add-column")
      .map((col) => {
        const meta = col.meta as { label?: string; prompt?: string } | undefined;
        return {
          id: col.id ?? "",
          label: meta?.label ?? col.id ?? "",
          prompt: meta?.prompt,
        };
      });
  }, [columns]);

  const getSelectionContext = React.useCallback((): SelectionContext | null => {
    const selectionState = tableMeta.selectionState;
    if (!selectionState || selectionState.selectedCells.size === 0) return null;

    const selectedCells: Array<{ rowIndex: number; columnId: string }> = [];
    const rowSet = new Set<number>();
    const colSet = new Set<string>();

    for (const cellKey of selectionState.selectedCells) {
      const { rowIndex, columnId } = parseCellKey(cellKey);
      selectedCells.push({ rowIndex, columnId });
      rowSet.add(rowIndex);
      colSet.add(columnId);
    }

    const rows = Array.from(rowSet).sort((a, b) => a - b);
    const cols = Array.from(colSet);

    return {
      selectedCells,
      bounds: {
        minRow: rows[0] ?? 0,
        maxRow: rows[rows.length - 1] ?? 0,
        columns: cols,
      },
      currentColumns: columns
        .filter((col) => col.id && cols.includes(col.id))
        .map((col) => ({
          id: col.id ?? "",
          label: (col.meta as { label?: string } | undefined)?.label ?? col.id ?? "",
          variant: (col.meta as { cell?: { variant?: string } } | undefined)?.cell?.variant ?? "short-text",
          prompt: (col.meta as { prompt?: string } | undefined)?.prompt,
        })),
    };
  }, [tableMeta.selectionState, columns]);

  return (
    <>
      <div role="toolbar" aria-orientation="horizontal" className="flex items-center gap-2 justify-self-end p-2 [grid-area:toolbar]">
        <DataGridFilterMenu table={table} align="end" />
        <DataGridSortMenu table={table} align="end" />
        <DataGridRowHeightMenu table={table} align="end" />
        <DataGridViewMenu table={table} align="end" />
      </div>
      <div className="flex flex-col [grid-area:main]">
        <DataGrid
          {...dataGridProps}
          table={table}
          tableMeta={tableMeta}
          hasSelection={hasSelection}
          height={windowSize.height - 48}
        />
        <DataGridKeyboardShortcuts enableSearch={!!dataGridProps.searchState} />
        <Chat
          onColumnsGenerated={onColumnsGenerated}
          onColumnsUpdated={onColumnsUpdated}
          onColumnsDeleted={onColumnsDeleted}
          onDataEnriched={onDataEnriched}
          getSelectionContext={getSelectionContext}
          getExistingColumns={getExistingColumns}
          hasSelection={hasSelection}
          initialInput={initialChatInput}
        />
      </div>
    </>
  );
}
