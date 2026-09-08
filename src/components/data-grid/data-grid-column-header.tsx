"use client";

/* oxlint-disable jsx-a11y/prefer-tag-over-role -- the resizer is a focusable drag handle carrying aria-value*; <hr> is a content separator and cannot */
import type { DataGridFeatures, DataGridTable } from "@/lib/data-grid-features";
import type {
  Column,
  ColumnSort,
  Header,
  RowData,
  SortDirection,
  SortingState,
} from "@tanstack/react-table";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  EllipsisVerticalIcon,
  EyeOffIcon,
  PinIcon,
  PinOffIcon,
  TableColumnsSplitIcon,
  TrashIcon,
  XIcon,
} from "lucide-react";
import * as React from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getColumnVariant } from "@/lib/data-grid";
import type { CellSelectOption } from "@/lib/data-grid-types";
import { getCellOptions } from "@/lib/data-grid-types";
import { isFunction } from "@/lib/is-function";
import { cn } from "cn";
import { ColumnForm } from "@/components/data-grid/column-form";
import type { ColumnFormValues } from "@/components/data-grid/column-form";
import { genericMemo } from "@/lib/generic-memo";

interface DataGridColumnHeaderProps<TData extends RowData, TValue> extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onPointerDown"
> {
  header: Header<DataGridFeatures, TData, TValue>;
  table: DataGridTable<TData>;
  onColumnInsert?: (columnId: string, position: "left" | "right") => void;
  /** Attached to the popover trigger (a `<button>`), not to the header div. */
  onPointerDown?: React.PointerEventHandler<HTMLElement>;
}

const getHeaderLabel = <TData extends RowData, TValue>(
  column: Column<DataGridFeatures, TData, TValue>,
) => {
  const headerDef = column.columnDef.header;
  return column.columnDef.meta?.label || headerDef === undefined || isFunction(headerDef)
    ? column.id
    : headerDef;
};

interface DataGridColumnActionsProps<TData extends RowData, TValue> {
  column: Column<DataGridFeatures, TData, TValue>;
  table: DataGridTable<TData>;
  onColumnInsert?: (columnId: string, position: "left" | "right") => void;
}

const DataGridColumnActions = <TData extends RowData, TValue>({
  column,
  table,
  onColumnInsert,
}: DataGridColumnActionsProps<TData, TValue>) => {
  const pinnedPosition = column.getIsPinned();
  const isPinnedLeft = pinnedPosition === "start";
  const isPinnedRight = pinnedPosition === "end";

  const onSortingChange = React.useCallback(
    (direction: SortDirection) => {
      table.setSorting((prev: SortingState) => {
        const existingSortIndex = prev.findIndex((sort) => sort.id === column.id);
        const newSort: ColumnSort = {
          desc: direction === "desc",
          id: column.id,
        };

        if (existingSortIndex !== -1) {
          const updated = [...prev];
          updated[existingSortIndex] = newSort;
          return updated;
        }
        return [...prev, newSort];
      });
    },
    [column.id, table],
  );

  const onSortRemove = React.useCallback(() => {
    table.setSorting((prev: SortingState) => prev.filter((sort) => sort.id !== column.id));
  }, [column.id, table]);

  const onLeftPin = React.useCallback(() => {
    column.pin("start");
  }, [column]);

  const onRightPin = React.useCallback(() => {
    column.pin("end");
  }, [column]);

  const onUnpin = React.useCallback(() => {
    column.pin(false);
  }, [column]);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="flex h-full shrink-0 items-center px-1 text-muted-foreground hover:bg-accent/40 hover:text-foreground data-[state=open]:bg-accent/40 data-[state=open]:text-foreground">
        <EllipsisVerticalIcon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={0} className="w-48">
        {column.getCanSort() && (
          <>
            <DropdownMenuItem
              className="[&_svg]:text-muted-foreground"
              onClick={() => onSortingChange("asc")}
            >
              <ArrowUpIcon />
              Sort ascending
            </DropdownMenuItem>
            <DropdownMenuItem
              className="[&_svg]:text-muted-foreground"
              onClick={() => onSortingChange("desc")}
            >
              <ArrowDownIcon />
              Sort descending
            </DropdownMenuItem>
            {column.getIsSorted() && (
              <DropdownMenuItem className="[&_svg]:text-muted-foreground" onClick={onSortRemove}>
                <XIcon />
                Remove sort
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
          </>
        )}
        {onColumnInsert && (
          <>
            <DropdownMenuItem
              className="[&_svg]:text-muted-foreground"
              onClick={() => onColumnInsert(column.id, "left")}
            >
              <TableColumnsSplitIcon />
              Insert column left
            </DropdownMenuItem>
            <DropdownMenuItem
              className="[&_svg]:text-muted-foreground"
              onClick={() => onColumnInsert(column.id, "right")}
            >
              <TableColumnsSplitIcon />
              Insert column right
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {column.getCanPin() && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="[&_svg]:text-muted-foreground">
              <PinIcon />
              Pin column
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {isPinnedLeft ? (
                <DropdownMenuItem className="[&_svg]:text-muted-foreground" onClick={onUnpin}>
                  <PinOffIcon />
                  Unpin from left
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem className="[&_svg]:text-muted-foreground" onClick={onLeftPin}>
                  <PinIcon />
                  Pin to left
                </DropdownMenuItem>
              )}
              {isPinnedRight ? (
                <DropdownMenuItem className="[&_svg]:text-muted-foreground" onClick={onUnpin}>
                  <PinOffIcon />
                  Unpin from right
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem className="[&_svg]:text-muted-foreground" onClick={onRightPin}>
                  <PinIcon />
                  Pin to right
                </DropdownMenuItem>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        {column.getCanHide() && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="[&_svg]:text-muted-foreground"
              onClick={() => column.toggleVisibility(false)}
            >
              <EyeOffIcon />
              Hide column
            </DropdownMenuItem>
          </>
        )}
        {table.options.meta?.onColumnDelete && (
          <DropdownMenuItem
            className="text-destructive focus:text-destructive [&_svg]:text-destructive"
            onClick={() => table.options.meta?.onColumnDelete?.(column.id)}
          >
            <TrashIcon />
            Remove column
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

interface DataGridColumnResizerProps<TData extends RowData, TValue> {
  header: Header<DataGridFeatures, TData, TValue>;
  table: DataGridTable<TData>;
  label: string;
}

const DataGridColumnResizerImpl = <TData extends RowData, TValue>({
  header,
  table,
  label,
}: DataGridColumnResizerProps<TData, TValue>) => {
  const defaultColumnDef = table.getDefaultColumnDef();

  const onDoubleClick = React.useCallback(() => {
    header.column.resetSize();
  }, [header.column]);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${label} column`}
      aria-valuenow={header.column.getSize()}
      aria-valuemin={defaultColumnDef.minSize}
      aria-valuemax={defaultColumnDef.maxSize}
      tabIndex={0}
      className={cn(
        "absolute -end-px top-0 z-50 h-full w-0.5 cursor-ew-resize touch-none select-none bg-border transition-opacity after:absolute after:inset-y-0 after:start-1/2 after:h-full after:w-[18px] after:-translate-x-1/2 after:content-[''] hover:bg-primary focus:bg-primary focus:outline-none",
        header.column.getIsResizing() ? "bg-primary" : "opacity-0 hover:opacity-100",
      )}
      onDoubleClick={onDoubleClick}
      onMouseDown={header.getResizeHandler()}
      onTouchStart={header.getResizeHandler()}
    />
  );
};
const DataGridColumnResizer = genericMemo(DataGridColumnResizerImpl, (prev, next) => {
  const prevColumn = prev.header.column;
  const nextColumn = next.header.column;

  if (
    prevColumn.getIsResizing() !== nextColumn.getIsResizing() ||
    prevColumn.getSize() !== nextColumn.getSize()
  ) {
    return false;
  }

  if (prev.label !== next.label) {
    return false;
  }

  return true;
});

export const DataGridColumnHeader = <TData extends RowData, TValue>({
  header,
  table,
  className,
  onPointerDown,
  onColumnInsert,
  ...props
}: DataGridColumnHeaderProps<TData, TValue>) => {
  const { column } = header;
  const label = getHeaderLabel(column);

  const currentPrompt = column.columnDef.meta?.prompt ?? "";
  const currentOptions: CellSelectOption[] = getCellOptions(column.columnDef.meta?.cell) ?? [];

  const isAnyColumnResizing = table.state.columnResizing.isResizingColumn;

  const cellVariant = column.columnDef.meta?.cell;
  const currentType = cellVariant?.variant ?? "short-text";
  const columnVariant = getColumnVariant(currentType);
  const isSelectType = currentType === "select" || currentType === "multi-select";

  const [popoverOpen, setPopoverOpen] = React.useState(false);

  const handleSave = React.useCallback(
    (values: ColumnFormValues) => {
      // Always pass all values for select types to avoid stale closure issues
      // The onColumnUpdate handler will handle the update appropriately
      table.options.meta?.onColumnUpdate?.(column.id, {
        label: values.label,
        options: isSelectType ? values.options : undefined,
        prompt: values.prompt,
      });
      setPopoverOpen(false);
    },
    [isSelectType, column.id, table.options.meta],
  );

  return (
    <>
      <div
        className={cn(
          "flex size-full items-center text-sm",
          isAnyColumnResizing && "pointer-events-none",
          className,
        )}
        {...props}
      >
        {/* Popover trigger for name/type editing */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger
            className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-2 hover:bg-accent/40 data-[state=open]:bg-accent/40"
            onPointerDown={(e) => {
              onPointerDown?.(e);
              if (e.defaultPrevented) {
                return;
              }
              if (e.button !== 0) {
                return;
              }
              table.options.meta?.onColumnClick?.(column.id);
            }}
          >
            {columnVariant && (
              <TooltipProvider delay={100}>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <columnVariant.icon className="size-3.5 shrink-0 text-muted-foreground" />
                    }
                  />
                  <TooltipContent side="top">
                    <p>{columnVariant.label}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <span className="truncate">{label}</span>
          </PopoverTrigger>
          <PopoverContent align="start" sideOffset={0} className="w-64 p-0" data-grid-popover>
            {popoverOpen && (
              <ColumnForm
                mode="edit"
                defaultValues={{
                  label,
                  options: currentOptions,
                  prompt: currentPrompt,
                  variant: currentType,
                }}
                onSubmit={handleSave}
                submitLabel="Save"
              />
            )}
          </PopoverContent>
        </Popover>

        <DataGridColumnActions column={column} table={table} onColumnInsert={onColumnInsert} />
      </div>
      {header.column.getCanResize() && (
        <DataGridColumnResizer header={header} table={table} label={label} />
      )}
    </>
  );
};
