"use client";

import { faker } from "@faker-js/faker";
import type { ColumnDef } from "@tanstack/react-table";
import * as React from "react";
import { DataGrid } from "@/components/data-grid/data-grid";
import { getDataGridAddColumn } from "@/components/data-grid/data-grid-add-column";
import { DataGridFilterMenu } from "@/components/data-grid/data-grid-filter-menu";
import { DataGridKeyboardShortcuts } from "@/components/data-grid/data-grid-keyboard-shortcuts";
import { DataGridRowHeightMenu } from "@/components/data-grid/data-grid-row-height-menu";
import { DataGridSortMenu } from "@/components/data-grid/data-grid-sort-menu";
import { DataGridViewMenu } from "@/components/data-grid/data-grid-view-menu";
import { type UseDataGridProps, useDataGrid } from "@/hooks/use-data-grid";
import { useWindowSize } from "@/hooks/use-window-size";
import { getFilterFn } from "@/lib/data-grid-filters";
import {
  getPeopleColumns,
  getPeopleData,
  getCompaniesColumns,
  getCompaniesData,
  getSpreadsheetColumns,
  getSpreadsheetData,
  type Person,
  type Company,
  type SpreadsheetRow,
} from "@/data/seed";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Chat } from "@/components/chat/chat";
import type { CellOpts, CellUpdate } from "@/lib/data-grid-types";
import type { SelectionContext } from "@/lib/selection-context";
import { parseCellKey } from "@/lib/data-grid";

type DataType = "people" | "companies" | "spreadsheet";

type DataRow = Person | Company | SpreadsheetRow;

type DataTypeConfig<T extends DataRow = DataRow> = {
  label: string;
  getData: () => T[];
  getColumns: (filterFn: ReturnType<typeof getFilterFn>) => ColumnDef<T>[];
  getRowId: (row: T, index: number) => string;
  createNewRow: () => T;
  createNewRows: (count: number) => T[];
  pinnedColumns: string[];
  defaultColumnId: string;
};

const dataTypeConfigs: Record<
  DataType,
  DataTypeConfig<Person> | DataTypeConfig<Company> | DataTypeConfig<SpreadsheetRow>
> = {
  spreadsheet: {
    label: "Spreadsheet",
    getData: getSpreadsheetData,
    getColumns: (filterFn) =>
      getSpreadsheetColumns(filterFn as ReturnType<typeof getFilterFn<SpreadsheetRow>>),
    getRowId: (_row: SpreadsheetRow, index: number) => `row-${index}`,
    createNewRow: () => {
      const columns = Array.from({ length: 26 }, (_, i) =>
        String.fromCharCode(65 + i)
      );
      const row: SpreadsheetRow = {};
      for (const col of columns) {
        row[col] = "";
      }
      return row;
    },
    createNewRows: (count) => {
      const columns = Array.from({ length: 26 }, (_, i) =>
        String.fromCharCode(65 + i)
      );
      return Array.from({ length: count }, () => {
        const row: SpreadsheetRow = {};
        for (const col of columns) {
          row[col] = "";
        }
        return row;
      });
    },
    pinnedColumns: ["index"],
    defaultColumnId: "A",
  },
  people: {
    label: "People",
    getData: getPeopleData,
    getColumns: (filterFn) =>
      getPeopleColumns(filterFn as ReturnType<typeof getFilterFn<Person>>),
    getRowId: (row: Person) => row.id,
    createNewRow: () => ({ id: faker.string.nanoid(8) } as Person),
    createNewRows: (count) =>
      Array.from({ length: count }, () => ({
        id: faker.string.nanoid(8),
      })) as Person[],
    pinnedColumns: ["select"],
    defaultColumnId: "name",
  },
  companies: {
    label: "Companies",
    getData: getCompaniesData,
    getColumns: (filterFn) =>
      getCompaniesColumns(filterFn as ReturnType<typeof getFilterFn<Company>>),
    getRowId: (row: Company) => row.id,
    createNewRow: () => ({ id: faker.string.nanoid(8) } as Company),
    createNewRows: (count) =>
      Array.from({ length: count }, () => ({
        id: faker.string.nanoid(8),
      })) as Company[],
    pinnedColumns: ["select"],
    defaultColumnId: "name",
  },
};

export default function DataGridPage() {
  const windowSize = useWindowSize({ defaultHeight: 760 });
  const [dataType, setDataType] = React.useState<DataType>("spreadsheet");
  const config = dataTypeConfigs[dataType];

  const filterFn = React.useMemo(() => getFilterFn(), []);
  const [data, setData] = React.useState<DataRow[]>(config.getData());
  const [columns, setColumns] = React.useState<ColumnDef<DataRow>[]>(
    () => config.getColumns(filterFn) as ColumnDef<DataRow>[]
  );

  const onRowAdd: NonNullable<UseDataGridProps<DataRow>["onRowAdd"]> =
    React.useCallback(() => {
      // Called when user manually adds a single row (e.g., clicking "Add Row" button)
      // In a real app, you would make a server call here:
      // await fetch('/api/people', {
      //   method: 'POST',
      //   body: JSON.stringify({ name: 'New Person' })
      // });

      // For this demo, just add a new row to the data
      setData((prev) => [...prev, config.createNewRow()]);
      return {
        rowIndex: data.length,
        columnId: config.defaultColumnId,
      };
    }, [data.length, config]);

  const onRowsAdd: NonNullable<UseDataGridProps<DataRow>["onRowsAdd"]> =
    React.useCallback(
      (count: number) => {
        // Called when paste operation needs to create multiple rows at once
        // This is more efficient than calling onRowAdd multiple times - only a single API call needed
        // In a real app, you would make a server call here:
        // await fetch('/api/people/bulk', {
        //   method: 'POST',
        //   body: JSON.stringify({ count })
        // });

        // For this demo, create multiple rows in a single state update
        setData((prev) => [...prev, ...config.createNewRows(count)]);
      },
      [config]
    );

  const onRowsDelete: NonNullable<UseDataGridProps<DataRow>["onRowsDelete"]> =
    React.useCallback((rows) => {
      // In a real app, you would make a server call here:
      // await fetch('/api/people', {
      //   method: 'DELETE',
      //   body: JSON.stringify({ ids: rows.map(r => r.id) })
      // });

      // For this demo, just filter out the deleted rows
      setData((prev) => prev.filter((row) => !rows.includes(row)));
    }, []);

  const onFilesUpload: NonNullable<UseDataGridProps<DataRow>["onFilesUpload"]> =
    React.useCallback(
      async ({ files, rowIndex: _rowIndex, columnId: _columnId }) => {
        // In a real app, you would upload multiple files to your server/storage:
        // const row = data[rowIndex];
        // const formData = new FormData();
        // files.forEach(file => formData.append('files', file));
        // formData.append('personId', row.id);
        // formData.append('columnId', columnId);
        //
        // const response = await fetch('/api/upload', {
        //   method: 'POST',
        //   body: formData
        // });
        // const data = await response.json();
        // return data.files.map(f => ({
        //   id: f.fileId,
        //   name: f.fileName,
        //   size: f.fileSize,
        //   type: f.fileType,
        //   url: f.fileUrl
        // }));

        // For this demo, simulate an upload delay and create local URLs
        await new Promise((resolve) => setTimeout(resolve, 800));

        return files.map((file) => ({
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type,
          url: URL.createObjectURL(file),
        }));
      },
      []
    );

  const onFilesDelete: NonNullable<UseDataGridProps<DataRow>["onFilesDelete"]> =
    React.useCallback(async ({ fileIds, rowIndex, columnId }) => {
      // In a real app, you would delete multiple files from your server/storage:
      // const row = data[rowIndex];
      // await fetch('/api/files/batch-delete', {
      //   method: 'DELETE',
      //   body: JSON.stringify({ fileIds, personId: row.id, columnId })
      // });

      // For this demo, just log the deletion
      console.log(
        `Deleting ${fileIds.length} file(s) from row ${rowIndex}, column ${columnId}:`,
        fileIds
      );
    }, []);

  const onDataTypeChange = React.useCallback(
    (dataType: DataType) => {
      setDataType(dataType);
      setData(dataTypeConfigs[dataType].getData());
      setColumns(
        dataTypeConfigs[dataType].getColumns(filterFn) as ColumnDef<DataRow>[]
      );
    },
    [filterFn]
  );

  const tableMetaRef = React.useRef<
    ReturnType<typeof useDataGrid<DataRow>>["tableMeta"] | null
  >(null);

  const [generatingCells, setGeneratingCells] = React.useState<Set<string>>(
    () => new Set()
  );

  const onColumnsGenerated = React.useCallback(
    (newColumns: ColumnDef<unknown>[]) => {
      // Replace existing columns with new ones, keeping only system columns like "select" and "index"
      const existingSystemColumns = columns.filter(
        (col) => col.id === "select" || col.id === "index"
      );
      setColumns([
        ...existingSystemColumns,
        ...newColumns,
      ] as ColumnDef<DataRow>[]);
    },
    [columns]
  );

  const onDataEnriched = React.useCallback(
    (updates: CellUpdate[]) => {
      console.log("[onDataEnriched] Received updates:", updates);
      setData((prev) => {
        console.log("[onDataEnriched] Previous data length:", prev.length);
        const newData = [...prev];

        for (const update of updates) {
          // Validate rowIndex bounds (allow +1 for new row creation)
          if (
            typeof update.rowIndex !== "number" ||
            update.rowIndex < 0 ||
            update.rowIndex > newData.length
          ) {
            console.warn(
              `[onDataEnriched] Invalid rowIndex ${update.rowIndex}, must be 0-${newData.length}`
            );
            continue;
          }

          // Validate columnId exists
          const column = columns.find((col) => col.id === update.columnId);
          if (!column) {
            console.warn(
              `[onDataEnriched] Unknown columnId "${update.columnId}"`
            );
            continue;
          }

          // Validate value type matches column variant
          const variant = (column.meta as { cell?: CellOpts } | undefined)?.cell
            ?.variant;
          const value = update.value;

          if (value !== null && value !== undefined && value !== "") {
            switch (variant) {
              case "number":
                if (typeof value !== "number" && typeof value !== "string") {
                  console.warn(
                    `[onDataEnriched] Column "${update.columnId}" expects number, got ${typeof value}`
                  );
                  continue;
                }
                break;
              case "checkbox":
                if (typeof value !== "boolean") {
                  console.warn(
                    `[onDataEnriched] Column "${update.columnId}" expects boolean, got ${typeof value}`
                  );
                  continue;
                }
                break;
              case "multi-select":
                if (!Array.isArray(value)) {
                  console.warn(
                    `[onDataEnriched] Column "${update.columnId}" expects array, got ${typeof value}`
                  );
                  continue;
                }
                break;
              case "file":
                if (!Array.isArray(value)) {
                  console.warn(
                    `[onDataEnriched] Column "${update.columnId}" expects file array, got ${typeof value}`
                  );
                  continue;
                }
                break;
            }
          }

          // Ensure row exists for new row creation
          while (newData.length <= update.rowIndex) {
            newData.push({} as DataRow);
          }

          const row = newData[update.rowIndex];
          if (row) {
            // Create new row object to trigger React re-render
            newData[update.rowIndex] = {
              ...row,
              [update.columnId]: value,
            } as DataRow;
            console.log(`[onDataEnriched] Set row ${update.rowIndex}[${update.columnId}] =`, value);
          }
        }

        console.log("[onDataEnriched] Returning updated data, length:", newData.length);
        return newData;
      });
    },
    [columns]
  );

const getSelectionContext = React.useCallback((): SelectionContext | null => {
    const selectionState = tableMetaRef.current?.selectionState;
    if (!selectionState || selectionState.selectedCells.size === 0) {
      return null;
    }

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

    // Get column metadata for the selected columns
    const currentColumns: SelectionContext["currentColumns"] = columns
      .filter((col) => col.id && cols.includes(col.id))
      .map((col) => ({
        id: col.id ?? "",
        label:
          (col.meta as { label?: string } | undefined)?.label ?? col.id ?? "",
        variant:
          (col.meta as { cell?: { variant?: string } } | undefined)?.cell
            ?.variant ?? "short-text",
        prompt: (col.meta as { prompt?: string } | undefined)?.prompt,
      }));

    return {
      selectedCells,
      bounds: {
        minRow: rows[0] ?? 0,
        maxRow: rows[rows.length - 1] ?? 0,
        columns: cols,
      },
      currentColumns,
    };
  }, [columns]);

  const onColumnUpdate = React.useCallback(
    (
      columnId: string,
      updates: Partial<{
        label: string;
        variant: CellOpts["variant"];
        prompt: string;
      }>
    ) => {
      setColumns((prev) =>
        prev.map((col): ColumnDef<DataRow> => {
          if (col.id !== columnId) return col;

          const currentMeta = col.meta ?? {};
          const currentCell = currentMeta.cell ?? { variant: "short-text" as const };

          // Build new cell config based on variant change
          let newCell: CellOpts = currentCell;
          if (updates.variant && updates.variant !== currentCell.variant) {
            // When variant changes, create new cell config
            switch (updates.variant) {
              case "select":
              case "multi-select":
                newCell = { variant: updates.variant, options: [] };
                break;
              case "number":
                newCell = { variant: updates.variant };
                break;
              case "file":
                newCell = { variant: updates.variant };
                break;
              default:
                newCell = { variant: updates.variant };
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
          } as ColumnDef<DataRow>;
        })
      );
    },
    []
  );

  const onColumnDelete = React.useCallback((columnId: string) => {
    setColumns((prev) => prev.filter((col) => col.id !== columnId));
  }, []);

  const onColumnAdd = React.useCallback(
    (config: {
      label: string;
      variant: CellOpts["variant"];
      prompt: string;
      insertAfterColumnId?: string;
    }) => {
      const newId = `column_${Date.now()}`;

      // Build cell config based on variant type
      let cellConfig: CellOpts;
      switch (config.variant) {
        case "select":
        case "multi-select":
          cellConfig = { variant: config.variant, options: [] };
          break;
        default:
          cellConfig = { variant: config.variant } as CellOpts;
      }

      const newColumn: ColumnDef<DataRow> = {
        id: newId,
        accessorKey: newId,
        header: config.label,
        meta: {
          label: config.label,
          cell: cellConfig,
          prompt: config.prompt || undefined,
        },
      };

      setColumns((prev) => {
        if (!config.insertAfterColumnId) {
          return [...prev, newColumn];
        }

        const insertIndex = prev.findIndex(
          (col) => col.id === config.insertAfterColumnId
        );
        if (insertIndex === -1) {
          return [...prev, newColumn];
        }

        const result = [...prev];
        result.splice(insertIndex + 1, 0, newColumn);
        return result;
      });
    },
    []
  );

  const onEnrichColumn = React.useCallback(
    (_columnId: string, _prompt: string) => {
      // TODO: integrate with AI chat to enrich column data using the prompt
      // This would trigger the AI to process data for this column
      console.log(`Enrich column ${_columnId} with prompt: ${_prompt}`);
    },
    []
  );

  return (
    <>
      <DataGridImpl
        key={dataType}
        header={
          <header className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm">
                  <MenuIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {(Object.keys(dataTypeConfigs) as DataType[]).map((type) => (
                  <DropdownMenuItem
                    key={type}
                    onClick={() => onDataTypeChange(type)}
                    className={dataType === type ? "bg-accent" : ""}
                  >
                    {dataTypeConfigs[type].label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <h1>Data Grid</h1>
          </header>
        }
        pinnedColumns={config.pinnedColumns}
        data={data}
        onDataChange={setData}
        columns={columns}
        onRowAdd={onRowAdd}
        onRowsAdd={onRowsAdd}
        onRowsDelete={onRowsDelete}
        onFilesUpload={onFilesUpload}
        onFilesDelete={onFilesDelete}
        onColumnUpdate={onColumnUpdate}
        onColumnDelete={onColumnDelete}
        onColumnAdd={onColumnAdd}
        onEnrichColumn={onEnrichColumn}
        height={windowSize.height - 48}
        tableMetaRef={tableMetaRef}
        generatingCells={generatingCells}
        onGeneratingCellsChange={setGeneratingCells}
        onColumnsGenerated={onColumnsGenerated}
        onDataEnriched={onDataEnriched}
        getSelectionContext={getSelectionContext}
      />
    </>
  );
}

interface DataGridDemoImplProps
  extends Omit<UseDataGridProps<DataRow>, "generatingCells"> {
  header: React.ReactNode;
  height: number;
  pinnedColumns: string[];
  tableMetaRef?: React.MutableRefObject<
    ReturnType<typeof useDataGrid<DataRow>>["tableMeta"] | null
  >;
  // Chat-related props
  generatingCells?: Set<string>;
  onGeneratingCellsChange?: (cells: Set<string>) => void;
  onColumnsGenerated?: (columns: ColumnDef<unknown>[]) => void;
  onDataEnriched?: (updates: CellUpdate[]) => void;
  getSelectionContext?: () => SelectionContext | null;
}

function DataGridImpl({
  header,
  height,
  pinnedColumns,
  tableMetaRef,
  columns,
  onColumnAdd,
  generatingCells,
  onGeneratingCellsChange,
  onColumnsGenerated,
  onDataEnriched,
  getSelectionContext,
  ...props
}: DataGridDemoImplProps) {
  // Add the "add column" column if onColumnAdd is provided
  const effectiveColumns = React.useMemo(() => {
    if (!onColumnAdd) return columns;
    return [...(columns ?? []), getDataGridAddColumn<DataRow>()];
  }, [columns, onColumnAdd]);

  const { table, tableMeta, hasSelection, ...dataGridProps } = useDataGrid<DataRow>({
    columns: effectiveColumns,
    onColumnAdd,
    getRowId: (row, index) => {
      if ("id" in row && typeof row.id === "string") {
        return row.id;
      }
      return `row-${index}`;
    },
    initialState: {
      columnPinning: {
        left: pinnedColumns,
        right: onColumnAdd ? ["add-column"] : [],
      },
    },
    enableSearch: true,
    enablePaste: true,
    generatingCells,
    ...props,
  });

  React.useEffect(() => {
    if (tableMetaRef) {
      tableMetaRef.current = tableMeta;
    }
  }, [tableMeta, tableMetaRef]);

  return (
    <div className="flex flex-col min-h-dvh">
      <div className="flex items-center gap-2 p-2">
        {header}
        <div
          role="toolbar"
          aria-orientation="horizontal"
          className="flex items-center gap-2 ml-auto"
        >
          <DataGridFilterMenu table={table} align="end" />
          <DataGridSortMenu table={table} align="end" />
          <DataGridRowHeightMenu table={table} align="end" />
          <DataGridViewMenu table={table} align="end" />
        </div>
      </div>
      <DataGrid
        {...dataGridProps}
        table={table}
        tableMeta={tableMeta}
        hasSelection={hasSelection}
        height={height}
      />
      <DataGridKeyboardShortcuts enableSearch={!!dataGridProps.searchState} />
      <Chat
        onColumnsGenerated={onColumnsGenerated}
        onDataEnriched={onDataEnriched}
        getSelectionContext={getSelectionContext}
        onGeneratingCellsChange={onGeneratingCellsChange}
        hasSelection={hasSelection}
      />
    </div>
  );
}
