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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import type { CellOpts, CellSelectOption } from "@/lib/data-grid-types";
import { cn } from "@/components/ui/utils";
import { SelectOptionsEditor } from "@/components/data-grid/select-options-editor";

interface DataGridColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  header: Header<TData, TValue>;
  table: Table<TData>;
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
  onColumnInsert,
  ...props
}: DataGridColumnHeaderProps<TData, TValue>) {
  const column = header.column;
  const label = column.columnDef.meta?.label
    ? column.columnDef.meta.label
    : typeof column.columnDef.header === "string"
      ? column.columnDef.header
      : column.id;

  const currentPrompt = column.columnDef.meta?.prompt ?? "";
  const currentOptions: CellSelectOption[] =
    (column.columnDef.meta?.cell as { options?: CellSelectOption[] } | undefined)?.options ?? [];

  const isAnyColumnResizing =
    table.getState().columnSizingInfo.isResizingColumn;

  const cellVariant = column.columnDef.meta?.cell;
  const currentType = cellVariant?.variant ?? "short-text";
  const columnVariant = getColumnVariant(currentType);
  const currentTypeLabel =
    COLUMN_TYPE_OPTIONS.find((opt) => opt.value === currentType)?.label ??
    "Text";
  const isSelectType = currentType === "select" || currentType === "multi-select";

  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [editedLabel, setEditedLabel] = React.useState(label);
  const [editedPrompt, setEditedPrompt] = React.useState(currentPrompt);
  const [editedOptions, setEditedOptions] = React.useState<CellSelectOption[]>(currentOptions);

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

  const handlePopoverOpenChange = React.useCallback(
    (open: boolean) => {
      if (open) {
        // Reset to current values when opening
        setEditedLabel(label);
        setEditedPrompt(currentPrompt);
        setEditedOptions(currentOptions);
      } else {
        // Save changes on close
        const updates: { label?: string; prompt?: string; options?: CellSelectOption[] } = {};

        if (editedLabel !== label) {
          updates.label = editedLabel;
        }
        if (editedPrompt !== currentPrompt) {
          updates.prompt = editedPrompt;
        }
        // Check if options changed (for select types)
        if (isSelectType) {
          const optionsChanged =
            editedOptions.length !== currentOptions.length ||
            editedOptions.some(
              (opt, i) =>
                opt.label !== currentOptions[i]?.label ||
                opt.value !== currentOptions[i]?.value
            );
          if (optionsChanged) {
            updates.options = editedOptions;
          }
        }
        if (Object.keys(updates).length > 0) {
          table.options.meta?.onColumnUpdate?.(column.id, updates);
        }
      }
      setPopoverOpen(open);
    },
    [editedLabel, editedPrompt, editedOptions, label, currentPrompt, currentOptions, isSelectType, column.id, table.options.meta]
  );

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
        <Popover open={popoverOpen} onOpenChange={handlePopoverOpenChange}>
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
                className="h-8"
                autoFocus
              />
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Data Type</span>
                <div className="flex h-8 w-full items-center gap-2 rounded-md border bg-muted/50 px-2 text-sm">
                  {columnVariant && (
                    <columnVariant.icon className="size-4 text-muted-foreground" />
                  )}
                  <span>{currentTypeLabel}</span>
                </div>
              </div>
              {isSelectType && (
                <SelectOptionsEditor
                  options={editedOptions}
                  onChange={setEditedOptions}
                />
              )}
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Prompt</span>
                <Textarea
                  value={editedPrompt}
                  onChange={(e) => setEditedPrompt(e.target.value)}
                  placeholder="Instructions for AI enrichment, e.g., 'Find the company website'"
                  className="min-h-16 resize-none text-sm"
                />
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
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="[&_svg]:text-muted-foreground"
                  onSelect={() => column.toggleVisibility(false)}
                >
                  <EyeOffIcon />
                  Hide column
                </DropdownMenuItem>
              </>
            )}
            {table.options.meta?.onColumnDelete && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive [&_svg]:text-destructive"
                onSelect={() => table.options.meta?.onColumnDelete?.(column.id)}
              >
                <TrashIcon />
                Remove column
              </DropdownMenuItem>
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
