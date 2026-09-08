"use client";

import type { DataGridFeatures } from "@/lib/data-grid-features";
import type { ColumnDef, RowData, Table } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import * as React from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ColumnForm } from "@/components/data-grid/column-form";
import type { ColumnFormRef, ColumnFormValues } from "@/components/data-grid/column-form";

interface DataGridAddColumnHeaderProps<TData extends RowData> {
  table: Table<DataGridFeatures, TData>;
}

const DataGridAddColumnHeader = <TData extends RowData>({
  table,
}: DataGridAddColumnHeaderProps<TData>) => {
  const onColumnAdd = table.options.meta?.onColumnAdd;
  const [open, setOpen] = React.useState(false);
  const formRef = React.useRef<ColumnFormRef>(null);

  // Get the last visible non-system column to insert after
  const getInsertAfterColumnId = React.useCallback(
    () =>
      table
        .getVisibleLeafColumns()
        .findLast((col) => col.id !== "select" && col.id !== "add-column")?.id,
    [table],
  );

  const handleSubmit = React.useCallback(
    (values: ColumnFormValues) => {
      if (!onColumnAdd) {
        return;
      }

      const isSelectType = values.variant === "select" || values.variant === "multi-select";
      onColumnAdd({
        insertAfterColumnId: getInsertAfterColumnId(),
        label: values.label,
        options: isSelectType ? values.options : undefined,
        prompt: values.prompt,
        variant: values.variant,
      });

      formRef.current?.reset();
      setOpen(false);
    },
    [onColumnAdd, getInsertAfterColumnId],
  );

  if (!onColumnAdd) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex size-full cursor-pointer items-center justify-center transition-colors hover:bg-muted/50 focus:bg-muted/50 focus:outline-none"
          >
            <Plus className="size-4 text-muted-foreground" />
          </button>
        }
      />
      <PopoverContent align="end" sideOffset={0} className="w-64 p-0" data-grid-popover>
        {open && (
          <ColumnForm ref={formRef} mode="add" onSubmit={handleSubmit} submitLabel="Add Column" />
        )}
      </PopoverContent>
    </Popover>
  );
};

type GetDataGridAddColumnOptions<TData extends RowData> = Omit<
  Partial<ColumnDef<DataGridFeatures, TData>>,
  "id" | "header" | "cell"
>;

export const getDataGridAddColumn = <TData extends RowData>({
  size = 40,
  enableHiding = false,
  enableResizing = false,
  enableSorting = false,
  enablePinning = false,
  ...props
}: GetDataGridAddColumnOptions<TData> = {}): ColumnDef<DataGridFeatures, TData> => ({
  cell: () => null,
  enableHiding,
  enablePinning,
  enableResizing,
  enableSorting,
  header: ({ table }) => <DataGridAddColumnHeader table={table} />,
  id: "add-column",
  size,
  ...props,
});
