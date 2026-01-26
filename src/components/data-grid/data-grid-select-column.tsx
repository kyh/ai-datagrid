"use client";

import type {
  CellContext,
  ColumnDef,
  HeaderContext,
} from "@tanstack/react-table";
import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/components/ui/utils";

type HitboxSize = "default" | "sm" | "lg";

interface DataGridSelectHitboxProps {
  htmlFor: string;
  children: React.ReactNode;
  size?: HitboxSize;
  debug?: boolean;
}

function DataGridSelectHitbox({
  htmlFor,
  children,
  size,
  debug,
}: DataGridSelectHitboxProps) {
  return (
    <div
      className={cn(
        "group relative -my-1.5 h-[calc(100%+0.75rem)] py-1.5",
        size === "default" && "-ms-3 -me-2 ps-3 pe-2",
        size === "sm" && "-ms-3 -me-1.5 ps-3 pe-1.5",
        size === "lg" && "-mx-3 px-3",
      )}
    >
      {children}
      <label
        htmlFor={htmlFor}
        className={cn(
          "absolute inset-0 cursor-pointer",
          debug && "border border-red-500 border-dashed bg-red-500/20",
        )}
      />
    </div>
  );
}

interface DataGridSelectCheckboxProps
  extends Omit<React.ComponentProps<typeof Checkbox>, "id"> {
  rowNumber?: number;
  hitboxSize?: HitboxSize;
  debug?: boolean;
}

function DataGridSelectCheckbox({
  rowNumber,
  hitboxSize,
  debug,
  checked,
  className,
  ...props
}: DataGridSelectCheckboxProps) {
  const id = React.useId();

  const checkbox = (
    <Checkbox
      id={id}
      className={cn(
        "relative transition-[shadow,border,opacity] after:absolute after:-inset-2.5 after:content-[''] hover:border-primary/40",
        rowNumber !== undefined &&
          "opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100",
        className,
      )}
      checked={checked}
      {...props}
    />
  );

  if (rowNumber !== undefined) {
    return (
      <DataGridSelectHitbox htmlFor={id} size={hitboxSize} debug={debug}>
        <div className="group relative">
          <div
            aria-hidden="true"
            data-state={checked ? "checked" : "unchecked"}
            className="pointer-events-none absolute start-0 top-0 flex size-4 items-center justify-center text-muted-foreground text-xs tabular-nums transition-opacity group-hover:opacity-0 data-[state=checked]:opacity-0"
          >
            {rowNumber}
          </div>
          {checkbox}
        </div>
      </DataGridSelectHitbox>
    );
  }

  if (hitboxSize) {
    return (
      <DataGridSelectHitbox htmlFor={id} size={hitboxSize} debug={debug}>
        {checkbox}
      </DataGridSelectHitbox>
    );
  }

  return checkbox;
}

interface DataGridSelectHeaderProps<TData>
  extends Pick<HeaderContext<TData, unknown>, "table"> {
  hitboxSize?: HitboxSize;
  readOnly?: boolean;
  debug?: boolean;
}

function DataGridSelectHeader<TData>({
  table,
  hitboxSize,
  readOnly,
  debug,
}: DataGridSelectHeaderProps<TData>) {
  const onCheckedChange = React.useCallback(
    (value: boolean) => table.toggleAllPageRowsSelected(value),
    [table]
  );

  if (readOnly) {
    return (
      <div className="mt-1 flex items-center ps-1 text-muted-foreground text-sm">
        #
      </div>
    );
  }

  return (
    <DataGridSelectCheckbox
      aria-label="Select all"
      checked={
        table.getIsAllPageRowsSelected() ||
        (table.getIsSomePageRowsSelected() && "indeterminate")
      }
      onCheckedChange={onCheckedChange}
      hitboxSize={hitboxSize}
      debug={debug}
    />
  );
}

interface DataGridSelectCellProps<TData>
  extends Pick<CellContext<TData, unknown>, "row" | "table"> {
  enableRowMarkers?: boolean;
  hitboxSize?: HitboxSize;
  readOnly?: boolean;
  debug?: boolean;
}

function DataGridSelectCell<TData>({
  row,
  table,
  enableRowMarkers,
  hitboxSize,
  readOnly,
  debug,
}: DataGridSelectCellProps<TData>) {
  const meta = table.options.meta;
  const onRowSelect = meta?.onRowSelect;

  const rowNumber = enableRowMarkers
    ? (meta?.getVisualRowIndex?.(row.id) ?? row.index + 1)
    : undefined;

  const onCheckedChange = React.useCallback(
    (value: boolean) => {
      if (onRowSelect) {
        onRowSelect(row.index, value, false);
      } else {
        row.toggleSelected(value);
      }
    },
    [onRowSelect, row]
  );

  const onClick = React.useCallback(
    (event: React.MouseEvent) => {
      if (event.shiftKey) {
        event.preventDefault();
        onRowSelect?.(row.index, !row.getIsSelected(), true);
      }
    },
    [onRowSelect, row]
  );

  if (readOnly) {
    return (
      <div className="flex items-center ps-1 text-muted-foreground text-xs tabular-nums">
        {rowNumber ?? row.index + 1}
      </div>
    );
  }

  return (
    <DataGridSelectCheckbox
      aria-label={`Select row ${rowNumber ?? row.index + 1}`}
      checked={row.getIsSelected()}
      onCheckedChange={onCheckedChange}
      onClick={onClick}
      rowNumber={rowNumber}
      hitboxSize={hitboxSize}
      debug={debug}
    />
  );
}

interface GetDataGridSelectColumnOptions<TData>
  extends Omit<Partial<ColumnDef<TData>>, "id" | "header" | "cell"> {
  enableRowMarkers?: boolean;
  hitboxSize?: HitboxSize;
  readOnly?: boolean;
  debug?: boolean;
}

export function getDataGridSelectColumn<TData>({
  size = 40,
  enableHiding = false,
  enableResizing = false,
  enableSorting = false,
  enableRowMarkers = false,
  hitboxSize = "default",
  readOnly = false,
  debug = false,
  ...props
}: GetDataGridSelectColumnOptions<TData> = {}): ColumnDef<TData> {
  return {
    id: "select",
    header: ({ table }) => (
      <DataGridSelectHeader
        table={table}
        hitboxSize={hitboxSize}
        readOnly={readOnly}
        debug={debug}
      />
    ),
    cell: ({ row, table }) => (
      <DataGridSelectCell
        row={row}
        table={table}
        enableRowMarkers={enableRowMarkers}
        hitboxSize={hitboxSize}
        readOnly={readOnly}
        debug={debug}
      />
    ),
    size,
    enableHiding,
    enableResizing,
    enableSorting,
    ...props,
  };
}
