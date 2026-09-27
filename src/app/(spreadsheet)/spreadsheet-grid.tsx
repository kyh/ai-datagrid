"use client";

import { DataGridContainer } from "@/components/data-grid/data-grid-container";
import { getFilterFn } from "@/lib/data-grid-filters";
import { getSpreadsheetColumns, getSpreadsheetData } from "@/data/seed";
import type { SpreadsheetRow } from "@/data/seed";

const createSpreadsheetRow = (): SpreadsheetRow => {
  const columns = Array.from({ length: 26 }, (_, i) => String.fromCodePoint(65 + i));
  const row: SpreadsheetRow = {};
  for (const col of columns) {
    row[col] = "";
  }
  return row;
};

const createSpreadsheetRows = (count: number): SpreadsheetRow[] => {
  const columns = Array.from({ length: 26 }, (_, i) => String.fromCodePoint(65 + i));
  return Array.from({ length: count }, () => {
    const row: SpreadsheetRow = {};
    for (const col of columns) {
      row[col] = "";
    }
    return row;
  });
};

export const SpreadsheetGrid = () => {
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
};
