"use client";

import type { ColumnDef, Table } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import * as React from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ColumnForm, type ColumnFormValues } from "@/components/data-grid/column-form";

interface DataGridAddColumnHeaderProps<TData> {
  table: Table<TData>;
}

function DataGridAddColumnHeader<TData>({
  table,
}: DataGridAddColumnHeaderProps<TData>) {
  const onColumnAdd = table.options.meta?.onColumnAdd;
  const [open, setOpen] = React.useState(false);
  const [key, setKey] = React.useState(0);

  // Get the last visible non-system column to insert after
  const getInsertAfterColumnId = React.useCallback(() => {
    const visibleColumns = table.getVisibleLeafColumns();
    for (let i = visibleColumns.length - 1; i >= 0; i--) {
      const col = visibleColumns[i];
      if (col.id !== "select" && col.id !== "add-column") {
        return col.id;
      }
    }
    return undefined;
  }, [table]);

  const handleSubmit = React.useCallback(
    (values: ColumnFormValues) => {
      if (!onColumnAdd) return;

      const isSelectType = values.variant === "select" || values.variant === "multi-select";
      onColumnAdd({
        label: values.label,
        variant: values.variant,
        prompt: values.prompt,
        options: isSelectType ? values.options : undefined,
        insertAfterColumnId: getInsertAfterColumnId(),
      });

      // Reset form by changing key
      setKey((k) => k + 1);
      setOpen(false);
    },
    [onColumnAdd, getInsertAfterColumnId]
  );

  if (!onColumnAdd) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          className="flex size-full cursor-pointer items-center justify-center transition-colors hover:bg-muted/50 focus:bg-muted/50 focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen(true);
            }
          }}
        >
          <Plus className="size-4 text-muted-foreground" />
        </div>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={0}
        className="w-64 p-0"
        data-grid-popover
      >
        <ColumnForm
          key={key}
          mode="add"
          onSubmit={handleSubmit}
          submitLabel="Add Column"
        />
      </PopoverContent>
    </Popover>
  );
}

interface GetDataGridAddColumnOptions<TData>
  extends Omit<Partial<ColumnDef<TData>>, "id" | "header" | "cell"> {}

export function getDataGridAddColumn<TData>({
  size = 40,
  enableHiding = false,
  enableResizing = false,
  enableSorting = false,
  enablePinning = false,
  ...props
}: GetDataGridAddColumnOptions<TData> = {}): ColumnDef<TData> {
  return {
    id: "add-column",
    header: ({ table }) => <DataGridAddColumnHeader table={table} />,
    cell: () => null,
    size,
    enableHiding,
    enableResizing,
    enableSorting,
    enablePinning,
    ...props,
  };
}
