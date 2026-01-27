"use client";

import { DataGridContainer } from "@/components/data-grid/data-grid-container";
import { getFilterFn } from "@/lib/data-grid-filters";
import { getSpreadsheetColumns, getSpreadsheetData, type SpreadsheetRow } from "@/data/seed";

function createSpreadsheetRow(): SpreadsheetRow {
  const columns = Array.from({ length: 26 }, (_, i) =>
    String.fromCharCode(65 + i)
  );
  const row: SpreadsheetRow = {};
  for (const col of columns) {
    row[col] = "";
  }
  return row;
}

function createSpreadsheetRows(count: number): SpreadsheetRow[] {
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
}

export default function SpreadsheetPage() {
  const data = getSpreadsheetData();
  const columns = getSpreadsheetColumns(getFilterFn());

  return (
    <DataGridContainer<SpreadsheetRow>
      initialData={data}
      initialColumns={columns}
      getRowId={(_row, index) => `row-${index}`}
      createNewRow={createSpreadsheetRow}
      createNewRows={createSpreadsheetRows}
      pinnedColumns={["index"]}
      defaultColumnId="A"
    />
  );
}
