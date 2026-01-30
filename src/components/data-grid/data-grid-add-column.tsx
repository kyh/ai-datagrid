"use client";

import type { ColumnDef, Table } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getColumnVariant } from "@/lib/data-grid";
import type { CellOpts, CellSelectOption } from "@/lib/data-grid-types";
import { SelectOptionsEditor } from "@/components/data-grid/select-options-editor";

const CELL_VARIANTS: Array<{ value: CellOpts["variant"]; label: string }> = [
  { value: "short-text", label: "Text" },
  { value: "long-text", label: "Long Text" },
  { value: "number", label: "Number" },
  { value: "select", label: "Select" },
  { value: "multi-select", label: "Multi-select" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Date" },
  { value: "url", label: "URL" },
  { value: "file", label: "File" },
];

interface DataGridAddColumnHeaderProps<TData> {
  table: Table<TData>;
}

function DataGridAddColumnHeader<TData>({
  table,
}: DataGridAddColumnHeaderProps<TData>) {
  const onColumnAdd = table.options.meta?.onColumnAdd;
  const [open, setOpen] = React.useState(false);
  const [label, setLabel] = React.useState("");
  const [variant, setVariant] = React.useState<CellOpts["variant"]>("short-text");
  const [prompt, setPrompt] = React.useState("");
  const [options, setOptions] = React.useState<CellSelectOption[]>([]);

  const columnVariant = getColumnVariant(variant);
  const isSelectType = variant === "select" || variant === "multi-select";

  // Get the last visible non-system column to insert after
  const getInsertAfterColumnId = React.useCallback(() => {
    const visibleColumns = table.getVisibleLeafColumns();
    // Find the last column that's not a system column (select, add-column)
    for (let i = visibleColumns.length - 1; i >= 0; i--) {
      const col = visibleColumns[i];
      if (col.id !== "select" && col.id !== "add-column") {
        return col.id;
      }
    }
    return undefined;
  }, [table]);

  const handleSubmit = React.useCallback(() => {
    if (!onColumnAdd || !label.trim()) return;

    onColumnAdd({
      label: label.trim(),
      variant,
      prompt: prompt.trim(),
      options: isSelectType ? options : undefined,
      insertAfterColumnId: getInsertAfterColumnId(),
    });

    // Reset form
    setLabel("");
    setVariant("short-text");
    setPrompt("");
    setOptions([]);
    setOpen(false);
  }, [onColumnAdd, label, variant, prompt, options, isSelectType, getInsertAfterColumnId]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && label.trim()) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit, label]
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
        <div className="space-y-3 p-3">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Name</span>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Column name"
              className="h-8"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Data Type</span>
            <Select value={variant} onValueChange={(v) => setVariant(v as CellOpts["variant"])}>
              <SelectTrigger className="h-8 w-full">
                <SelectValue>
                  {columnVariant && (
                    <span className="flex items-center gap-2">
                      <columnVariant.icon className="size-4 text-muted-foreground" />
                      {CELL_VARIANTS.find((v) => v.value === variant)?.label ?? variant}
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CELL_VARIANTS.map((v) => {
                  const variantInfo = getColumnVariant(v.value);
                  return (
                    <SelectItem key={v.value} value={v.value}>
                      <span className="flex items-center gap-2">
                        {variantInfo && (
                          <variantInfo.icon className="size-4 text-muted-foreground" />
                        )}
                        {v.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          {isSelectType && (
            <SelectOptionsEditor options={options} onChange={setOptions} />
          )}
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Prompt</span>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Instructions for AI enrichment"
              className="min-h-16 resize-none text-sm"
            />
          </div>
          <Button
            size="sm"
            className="w-full"
            onClick={handleSubmit}
            disabled={!label.trim()}
          >
            Add Column
          </Button>
        </div>
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
