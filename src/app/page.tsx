"use client";

import { faker } from "@faker-js/faker";
import type { ColumnDef } from "@tanstack/react-table";
import * as React from "react";
import { DataGrid } from "@/components/data-grid/data-grid";
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
  getBlankColumns,
  getBlankData,
  type Person,
  type BlankRow,
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

type DataType = "people" | "blank";

type DataRow = Person | BlankRow;

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
  DataTypeConfig<Person> | DataTypeConfig<BlankRow>
> = {
  blank: {
    label: "Blank",
    getData: getBlankData,
    getColumns: (filterFn) =>
      getBlankColumns(filterFn as ReturnType<typeof getFilterFn<BlankRow>>),
    getRowId: (_row: BlankRow, index: number) => `blank-${index}`,
    createNewRow: () => {
      const columns = Array.from({ length: 26 }, (_, i) =>
        String.fromCharCode(65 + i)
      );
      const row: BlankRow = {};
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
        const row: BlankRow = {};
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
};

export default function DataGridPage() {
  const windowSize = useWindowSize({ defaultHeight: 760 });
  const [dataType, setDataType] = React.useState<DataType>("blank");
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
        height={windowSize.height - 48}
      />
      <Chat />
    </>
  );
}

interface DataGridDemoImplProps extends UseDataGridProps<DataRow> {
  header: React.ReactNode;
  height: number;
  pinnedColumns: string[];
}

function DataGridImpl({
  header,
  height,
  pinnedColumns,
  ...props
}: DataGridDemoImplProps) {
  const { table, ...dataGridProps } = useDataGrid<DataRow>({
    getRowId: (row, index) => {
      if ("id" in row && typeof row.id === "string") {
        return row.id;
      }
      return `blank-${index}`;
    },
    initialState: {
      columnPinning: {
        left: pinnedColumns,
      },
    },
    enableSearch: true,
    enablePaste: true,
    ...props,
  });

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
      <DataGrid {...dataGridProps} table={table} height={height} />
      <DataGridKeyboardShortcuts enableSearch={!!dataGridProps.searchState} />
    </div>
  );
}
