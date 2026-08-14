import type { ReactTable, RowData } from "@tanstack/react-table";
import {
  columnFilteringFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createFilteredRowModel,
  createSortedRowModel,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
} from "@tanstack/react-table";

/**
 * The feature set every data grid table is built on. react-table v9 makes
 * features opt-in and carries them in the table's type, so this is the single
 * source both the runtime instance and every `Table`/`Row`/`Column` annotation
 * in the grid refer to. Row models moved from table options into this set;
 * omitting one silently drops the behaviour rather than failing to compile.
 */
export const dataGridFeatures = tableFeatures({
  columnFilteringFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  rowSelectionFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
});

export type DataGridFeatures = typeof dataGridFeatures;

/**
 * The instance every grid component receives. v9 dropped `table.getState()`
 * from the core instance — state reads go through the React wrapper's `state`
 * (or `table.atoms.<slice>.get()`), so components annotate against the wrapper
 * rather than the core `Table`.
 */
export type DataGridTable<TData extends RowData> = ReactTable<DataGridFeatures, TData>;
