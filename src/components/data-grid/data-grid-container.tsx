"use client";

import type { DataGridFeatures } from "@/lib/data-grid-features";
import type { ColumnDef, RowData } from "@tanstack/react-table";
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
import type { CellOpts, CellSelectOption, CellUpdate, FilterValue } from "@/lib/data-grid-types";
import { asRow, getCellOptions, isCellVariant } from "@/lib/data-grid-types";
import { isFilterValue } from "@/lib/data-grid-filters";
import type { ColumnUpdate } from "@/lib/assistant-schemas";
import type { SelectionContext } from "@/lib/selection-context";
import { getCellKey, parseCellKey } from "@/lib/data-grid";
import { useDataGridStore } from "@/stores/data-grid-store";

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

export interface DataGridContainerProps<T extends Record<string, unknown>> {
  initialData: T[];
  initialColumns: ColumnDef<DataGridFeatures, T>[];
  getRowId: (row: T, index: number) => string;
  createNewRow: () => T;
  createNewRows: (count: number) => T[];
  pinnedColumns: string[];
  defaultColumnId: string;
  initialChatInput?: string;
}

/**
 * `ColumnDef<DataGridFeatures, T>` is a union (accessor-key / accessor-fn / display / group) and
 * spreading a union member widens it past every variant, so TS cannot see that
 * an edited copy is still the same kind of column. Only `header`/`meta` ever
 * change here, which never alters the variant — this is the one place that is
 * restated.
 */
function withColumnPatch<T extends RowData>(
  column: ColumnDef<DataGridFeatures, T>,
  patch: Partial<Pick<ColumnDef<DataGridFeatures, T>, "header" | "meta">>,
): ColumnDef<DataGridFeatures, T> {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- see comment above
  return { ...column, ...patch } as ColumnDef<DataGridFeatures, T>;
}

export function DataGridContainer<T extends Record<string, unknown>>({
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
  const [columns, setColumns] = React.useState<ColumnDef<DataGridFeatures, T>[]>(initialColumns);

  const onColumnUpdate = React.useCallback(
    (
      columnId: string,
      updates: Partial<{
        label: string;
        variant: CellOpts["variant"];
        prompt: string;
        options: CellSelectOption[];
      }>,
    ) => {
      setColumns((prev) =>
        prev.map((col): ColumnDef<DataGridFeatures, T> => {
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
            if (newCell.variant === "select" || newCell.variant === "multi-select") {
              newCell = { ...newCell, options: updates.options };
            }
          }

          return withColumnPatch(col, {
            header: updates.label ?? col.header,
            meta: {
              ...currentMeta,
              label: updates.label ?? currentMeta.label,
              cell: newCell,
              prompt: updates.prompt ?? currentMeta.prompt,
            },
          });
        }),
      );
    },
    [],
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
        (cellConfig.variant === "select" || cellConfig.variant === "multi-select")
      ) {
        cellConfig = { ...cellConfig, options: addConfig.options };
      }

      const newColumn: ColumnDef<DataGridFeatures, T> = {
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

      // Initialize the new column data in all existing rows
      setData((prev) =>
        prev.map((row) => ({
          ...row,
          [newId]: "",
        })),
      );
    },
    [],
  );

  const setSelectionState = useDataGridStore((state) => state.setSelectionState);

  const onEnrichColumn = React.useCallback(
    (columnId: string, prompt: string) => {
      // Persist the prompt so the enrich agent reads it from column meta,
      // then select the whole column so the chat's Enrich action targets it.
      onColumnUpdate(columnId, { prompt });
      const selectedCells = new Set(data.map((_, rowIndex) => getCellKey(rowIndex, columnId)));
      setSelectionState({
        selectedCells,
        selectionRange: null,
        isSelecting: false,
      });
    },
    [data, onColumnUpdate, setSelectionState],
  );

  const effectiveColumns = React.useMemo(() => [...columns, getDataGridAddColumn<T>()], [columns]);

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
    // No onFilesDelete: files live in memory as blob URLs; the file cell
    // revokes them and updates the row itself. Wire this up when uploads
    // persist to real storage.
    onColumnUpdate,
    onColumnDelete,
    onColumnAdd,
    onEnrichColumn,
    initialState: {
      columnPinning: {
        start: pinnedColumns,
        end: ["add-column"],
      },
    },
    enableSearch: true,
    enablePaste: true,
  });

  const onColumnsGenerated = React.useCallback(
    (newColumns: ColumnDef<DataGridFeatures, Record<string, unknown>>[]) => {
      // Get IDs of existing non-system columns
      const existingIds = new Set(
        columns
          .filter((col) => col.id !== "select" && col.id !== "index" && col.id !== "add-column")
          .map((col) => col.id),
      );

      // Filter out new columns that would duplicate existing ones
      const columnsToAdd = newColumns.filter((col) => !existingIds.has(col.id));
      const newColumnIds = columnsToAdd.map((col) => col.id).filter((id) => id !== undefined);

      // Add new columns
      // Columns generated by the assistant describe a runtime schema: they are
      // accessor-key defs over string keys, so they address `T` correctly but
      // cannot be proven to — `T` is nominal and these are built from a tool
      // result. This is the boundary where generated columns enter typed state.
      // oxlint-disable-next-line typescript/consistent-type-assertions -- see comment above
      setColumns((prev) => [...prev, ...(columnsToAdd as ColumnDef<DataGridFeatures, T>[])]);

      // Initialize new column properties in existing data rows
      if (newColumnIds.length > 0) {
        setData((prev) =>
          prev.map((row) => {
            const updates: Record<string, unknown> = {};
            for (const colId of newColumnIds) {
              if (!(colId in row)) {
                updates[colId] = undefined;
              }
            }
            return Object.keys(updates).length > 0 ? { ...row, ...updates } : row;
          }),
        );
      }
    },
    [columns],
  );

  const onDataEnriched = React.useCallback(
    (updates: CellUpdate[]) => {
      setData((prev) => {
        const newData = [...prev];
        for (const update of updates) {
          if (update.rowIndex < 0 || update.rowIndex > newData.length) continue;
          if (!columns.find((col) => col.id === update.columnId)) continue;

          while (newData.length <= update.rowIndex) {
            newData.push(asRow<T>({}));
          }
          const row = newData[update.rowIndex];
          if (row) {
            newData[update.rowIndex] = { ...row, [update.columnId]: update.value };
          }
        }
        return newData;
      });
    },
    [columns],
  );

  const onColumnsUpdated = React.useCallback(
    (updates: ColumnUpdate[]) => {
      for (const update of updates) {
        onColumnUpdate(update.columnId, {
          label: update.label,
          variant: isCellVariant(update.variant) ? update.variant : undefined,
          prompt: update.prompt,
        });
        // Handle options update for select/multi-select
        if (update.options) {
          setColumns((prev) =>
            prev.map((col): ColumnDef<DataGridFeatures, T> => {
              if (col.id !== update.columnId) return col;
              const currentMeta = col.meta ?? {};
              const currentCell = currentMeta.cell;
              if (
                currentCell &&
                (currentCell.variant === "select" || currentCell.variant === "multi-select")
              ) {
                return withColumnPatch(col, {
                  meta: {
                    ...currentMeta,
                    cell: {
                      ...currentCell,
                      options: update.options ?? currentCell.options,
                    },
                  },
                });
              }
              return col;
            }),
          );
        }
      }
    },
    [onColumnUpdate],
  );

  const onColumnsDeleted = React.useCallback(
    (columnIds: string[]) => {
      for (const columnId of columnIds) {
        onColumnDelete(columnId);
      }
    },
    [onColumnDelete],
  );

  const getExistingColumns = React.useCallback(() => {
    return columns
      .filter(
        (col) => col.id && col.id !== "select" && col.id !== "index" && col.id !== "add-column",
      )
      .map((col) => {
        const meta = col.meta;
        return {
          id: col.id ?? "",
          label: meta?.label ?? col.id ?? "",
          variant: meta?.cell?.variant ?? "short-text",
          prompt: meta?.prompt,
          options: getCellOptions(meta?.cell),
        };
      });
  }, [columns]);

  // Filter and sort state from store
  const { columnFilters, setColumnFilters, sorting, setSorting } = useDataGridStore();

  const getExistingFilters = React.useCallback(() => {
    return columnFilters.map((f) => {
      const filterValue = isFilterValue(f.value) ? f.value : undefined;
      return {
        columnId: f.id,
        operator: filterValue?.operator ?? "contains",
        value: filterValue?.value,
      };
    });
  }, [columnFilters]);

  const getExistingSorts = React.useCallback(() => {
    return sorting.map((s) => ({
      columnId: s.id,
      direction: s.desc ? ("desc" as const) : ("asc" as const),
    }));
  }, [sorting]);

  const onFiltersAdded = React.useCallback(
    (filters: Array<{ columnId: string; value: FilterValue }>) => {
      const newFilters = [...columnFilters];
      for (const filter of filters) {
        // Remove any existing filter for this column
        const idx = newFilters.findIndex((f) => f.id === filter.columnId);
        if (idx !== -1) {
          newFilters.splice(idx, 1);
        }
        // Add the new filter
        newFilters.push({ id: filter.columnId, value: filter.value });
      }
      setColumnFilters(newFilters);
    },
    [columnFilters, setColumnFilters],
  );

  const onFiltersRemoved = React.useCallback(
    (columnIds: string[]) => {
      setColumnFilters(columnFilters.filter((f) => !columnIds.includes(f.id)));
    },
    [columnFilters, setColumnFilters],
  );

  const onFiltersCleared = React.useCallback(() => {
    setColumnFilters([]);
  }, [setColumnFilters]);

  const onSortsAdded = React.useCallback(
    (sorts: Array<{ columnId: string; desc: boolean }>) => {
      const newSorts = [...sorting];
      for (const sort of sorts) {
        // Remove any existing sort for this column
        const idx = newSorts.findIndex((s) => s.id === sort.columnId);
        if (idx !== -1) {
          newSorts.splice(idx, 1);
        }
        // Add the new sort
        newSorts.push({ id: sort.columnId, desc: sort.desc });
      }
      setSorting(newSorts);
    },
    [sorting, setSorting],
  );

  const onSortsRemoved = React.useCallback(
    (columnIds: string[]) => {
      setSorting(sorting.filter((s) => !columnIds.includes(s.id)));
    },
    [sorting, setSorting],
  );

  const onSortsCleared = React.useCallback(() => {
    setSorting([]);
  }, [setSorting]);

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

    const rows = Array.from(rowSet).toSorted((a, b) => a - b);
    const cols = Array.from(colSet);

    // Build row data for context-aware generation
    const rowData: Record<string, Record<string, unknown>> = {};
    for (const rowIndex of rows) {
      const row = data[rowIndex];
      if (row) {
        rowData[rowIndex] = row;
      }
    }

    return {
      selectedCells,
      bounds: {
        minRow: rows[0] ?? 0,
        maxRow: rows[rows.length - 1] ?? 0,
        columns: cols,
      },
      // Include ALL columns for context, not just selected ones
      currentColumns: columns
        .filter((col) => col.id)
        .map((col) => {
          const meta = col.meta;
          return {
            id: col.id ?? "",
            label: meta?.label ?? col.id ?? "",
            variant: meta?.cell?.variant ?? "short-text",
            prompt: meta?.prompt,
            options: getCellOptions(meta?.cell),
          };
        }),
      rowData,
    };
  }, [tableMeta.selectionState, columns, data]);

  return (
    <>
      <div
        role="toolbar"
        aria-orientation="horizontal"
        className="flex items-center gap-2 justify-self-end p-2 [grid-area:toolbar]"
      >
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
          onFiltersAdded={onFiltersAdded}
          onFiltersRemoved={onFiltersRemoved}
          onFiltersCleared={onFiltersCleared}
          onSortsAdded={onSortsAdded}
          onSortsRemoved={onSortsRemoved}
          onSortsCleared={onSortsCleared}
          getSelectionContext={getSelectionContext}
          getExistingColumns={getExistingColumns}
          getExistingFilters={getExistingFilters}
          getExistingSorts={getExistingSorts}
          hasSelection={hasSelection}
          initialInput={initialChatInput}
        />
      </div>
    </>
  );
}
