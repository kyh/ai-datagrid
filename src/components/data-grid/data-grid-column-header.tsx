"use client";

import type {
  ColumnSort,
  Header,
  SortDirection,
  SortingState,
  Table,
} from "@tanstack/react-table";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronRightIcon,
  EllipsisVerticalIcon,
  EyeOffIcon,
  PinIcon,
  PinOffIcon,
  TableColumnsSplitIcon,
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
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getColumnVariant } from "@/lib/data-grid";
import type { CellOpts } from "@/lib/data-grid-types";
import { cn } from "@/components/ui/utils";

interface DataGridColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  header: Header<TData, TValue>;
  table: Table<TData>;
  onColumnRename?: (columnId: string, newLabel: string) => void;
  onColumnTypeChange?: (columnId: string, newType: CellOpts["variant"]) => void;
  onColumnInsert?: (columnId: string, position: "left" | "right") => void;
}

const COLUMN_TYPE_OPTIONS: Array<{
  value: CellOpts["variant"];
  label: string;
}> = [
  { value: "short-text", label: "Text" },
  { value: "long-text", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "url", label: "URL" },
  { value: "checkbox", label: "Checkbox" },
  { value: "select", label: "Select" },
  { value: "multi-select", label: "Multi-select" },
  { value: "date", label: "Date" },
  { value: "file", label: "File" },
];

export function DataGridColumnHeader<TData, TValue>({
  header,
  table,
  className,
  onPointerDown,
  onColumnRename,
  onColumnTypeChange,
  onColumnInsert,
  ...props
}: DataGridColumnHeaderProps<TData, TValue>) {
  const column = header.column;
  const label = column.columnDef.meta?.label
    ? column.columnDef.meta.label
    : typeof column.columnDef.header === "string"
      ? column.columnDef.header
      : column.id;

  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [editedLabel, setEditedLabel] = React.useState(label);

  const isAnyColumnResizing =
    table.getState().columnSizingInfo.isResizingColumn;

  const cellVariant = column.columnDef.meta?.cell;
  const currentType = cellVariant?.variant ?? "short-text";
  const columnVariant = getColumnVariant(currentType);
  const currentTypeLabel =
    COLUMN_TYPE_OPTIONS.find((opt) => opt.value === currentType)?.label ??
    "Text";

  const pinnedPosition = column.getIsPinned();
  const isPinnedLeft = pinnedPosition === "left";
  const isPinnedRight = pinnedPosition === "right";

  const onSortingChange = React.useCallback(
    (direction: SortDirection) => {
      table.setSorting((prev: SortingState) => {
        const existingSortIndex = prev.findIndex(
          (sort) => sort.id === column.id
        );
        const newSort: ColumnSort = {
          id: column.id,
          desc: direction === "desc",
        };

        if (existingSortIndex >= 0) {
          const updated = [...prev];
          updated[existingSortIndex] = newSort;
          return updated;
        } else {
          return [...prev, newSort];
        }
      });
    },
    [column.id, table]
  );

  const onSortRemove = React.useCallback(() => {
    table.setSorting((prev: SortingState) =>
      prev.filter((sort) => sort.id !== column.id)
    );
  }, [column.id, table]);

  const onLeftPin = React.useCallback(() => {
    column.pin("left");
  }, [column]);

  const onRightPin = React.useCallback(() => {
    column.pin("right");
  }, [column]);

  const onUnpin = React.useCallback(() => {
    column.pin(false);
  }, [column]);

  const handleLabelBlur = React.useCallback(() => {
    if (editedLabel !== label && onColumnRename) {
      onColumnRename(column.id, editedLabel);
    }
  }, [editedLabel, label, column.id, onColumnRename]);

  const handleLabelKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.currentTarget.blur();
      } else if (e.key === "Escape") {
        setEditedLabel(label);
        e.currentTarget.blur();
      }
    },
    [label]
  );

  const handleTypeSelect = React.useCallback(
    (newType: CellOpts["variant"]) => {
      onColumnTypeChange?.(column.id, newType);
    },
    [column.id, onColumnTypeChange]
  );

  React.useEffect(() => {
    setEditedLabel(label);
  }, [label]);

  return (
    <>
      <div
        className={cn(
          "flex size-full items-center text-sm",
          isAnyColumnResizing && "pointer-events-none",
          className
        )}
        {...props}
      >
        {/* Popover trigger for name/type editing */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger
            className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-2 hover:bg-accent/40 data-[state=open]:bg-accent/40"
            onPointerDown={(e) => {
              onPointerDown?.(e as unknown as React.PointerEvent<HTMLDivElement>);
              if (e.defaultPrevented) return;
              if (e.button !== 0) return;
              table.options.meta?.onColumnClick?.(column.id);
            }}
          >
            {columnVariant && (
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <columnVariant.icon className="size-3.5 shrink-0 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{columnVariant.label}</p>
                </TooltipContent>
              </Tooltip>
            )}
            <span className="truncate">{label}</span>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={0}
            className="w-60 p-0"
            data-grid-popover
          >
            <div className="space-y-3 p-3">
              <Input
                value={editedLabel}
                onChange={(e) => setEditedLabel(e.target.value)}
                onBlur={handleLabelBlur}
                onKeyDown={handleLabelKeyDown}
                className="h-8"
                autoFocus
              />
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Data Type</span>
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-transparent px-2 text-sm hover:bg-accent/40">
                    <span>{currentTypeLabel}</span>
                    <ChevronRightIcon className="size-4 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" sideOffset={4}>
                    {COLUMN_TYPE_OPTIONS.map((option) => {
                      const variant = getColumnVariant(option.value);
                      return (
                        <DropdownMenuItem
                          key={option.value}
                          onSelect={() => handleTypeSelect(option.value)}
                          className="[&_svg]:text-muted-foreground"
                        >
                          {variant && <variant.icon className="size-4" />}
                          {option.label}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Three-dot menu for actions */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger className="flex h-full shrink-0 items-center px-1 text-muted-foreground hover:bg-accent/40 hover:text-foreground data-[state=open]:bg-accent/40 data-[state=open]:text-foreground">
            <EllipsisVerticalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={0} className="w-48">
            {column.getCanSort() && (
              <>
                <DropdownMenuItem
                  className="[&_svg]:text-muted-foreground"
                  onSelect={() => onSortingChange("asc")}
                >
                  <ArrowUpIcon />
                  Sort ascending
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="[&_svg]:text-muted-foreground"
                  onSelect={() => onSortingChange("desc")}
                >
                  <ArrowDownIcon />
                  Sort descending
                </DropdownMenuItem>
                {column.getIsSorted() && (
                  <DropdownMenuItem
                    className="[&_svg]:text-muted-foreground"
                    onSelect={onSortRemove}
                  >
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
                  onSelect={() => onColumnInsert(column.id, "left")}
                >
                  <TableColumnsSplitIcon />
                  Insert column left
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="[&_svg]:text-muted-foreground"
                  onSelect={() => onColumnInsert(column.id, "right")}
                >
                  <TableColumnsSplitIcon />
                  Insert column right
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {column.getCanPin() && (
              <>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="[&_svg]:text-muted-foreground">
                    <PinIcon />
                    Pin column
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {isPinnedLeft ? (
                      <DropdownMenuItem
                        className="[&_svg]:text-muted-foreground"
                        onSelect={onUnpin}
                      >
                        <PinOffIcon />
                        Unpin from left
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        className="[&_svg]:text-muted-foreground"
                        onSelect={onLeftPin}
                      >
                        <PinIcon />
                        Pin to left
                      </DropdownMenuItem>
                    )}
                    {isPinnedRight ? (
                      <DropdownMenuItem
                        className="[&_svg]:text-muted-foreground"
                        onSelect={onUnpin}
                      >
                        <PinOffIcon />
                        Unpin from right
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        className="[&_svg]:text-muted-foreground"
                        onSelect={onRightPin}
                      >
                        <PinIcon />
                        Pin to right
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </>
            )}
            {column.getCanHide() && (
              <>
                <DropdownMenuItem
                  className="[&_svg]:text-muted-foreground"
                  onSelect={() => column.toggleVisibility(false)}
                >
                  <EyeOffIcon />
                  Hide column
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {header.column.getCanResize() && (
        <DataGridColumnResizer header={header} table={table} label={label} />
      )}
    </>
  );
}

const DataGridColumnResizer = React.memo(
  DataGridColumnResizerImpl,
  (prev, next) => {
    const prevColumn = prev.header.column;
    const nextColumn = next.header.column;

    if (
      prevColumn.getIsResizing() !== nextColumn.getIsResizing() ||
      prevColumn.getSize() !== nextColumn.getSize()
    ) {
      return false;
    }

    if (prev.label !== next.label) return false;

    return true;
  }
) as typeof DataGridColumnResizerImpl;

interface DataGridColumnResizerProps<TData, TValue> {
  header: Header<TData, TValue>;
  table: Table<TData>;
  label: string;
}

function DataGridColumnResizerImpl<TData, TValue>({
  header,
  table,
  label,
}: DataGridColumnResizerProps<TData, TValue>) {
  const defaultColumnDef = table._getDefaultColumnDef();

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
        header.column.getIsResizing()
          ? "bg-primary"
          : "opacity-0 hover:opacity-100"
      )}
      onDoubleClick={onDoubleClick}
      onMouseDown={header.getResizeHandler()}
      onTouchStart={header.getResizeHandler()}
    />
  );
}
