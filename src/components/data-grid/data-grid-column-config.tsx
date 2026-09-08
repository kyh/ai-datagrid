"use client";

import type { DataGridFeatures, DataGridTable } from "@/lib/data-grid-features";
import type { Column, RowData } from "@tanstack/react-table";
import { SparklesIcon, TrashIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { getColumnVariant } from "@/lib/data-grid";
import type { CellOpts } from "@/lib/data-grid-types";
import { isFunction } from "@/lib/is-function";

const CELL_VARIANTS: { value: CellOpts["variant"]; label: string }[] = [
  { label: "Text", value: "short-text" },
  { label: "Long Text", value: "long-text" },
  { label: "Number", value: "number" },
  { label: "Select", value: "select" },
  { label: "Multi-select", value: "multi-select" },
  { label: "Checkbox", value: "checkbox" },
  { label: "Date", value: "date" },
  { label: "URL", value: "url" },
  { label: "File", value: "file" },
];

interface ColumnConfigState {
  label: string;
  variant: CellOpts["variant"];
  prompt: string;
}

type ColumnConfigUpdates = Partial<ColumnConfigState>;

interface DataGridColumnConfigProps<TData extends RowData> {
  column: Column<DataGridFeatures, TData, unknown>;
  table: DataGridTable<TData>;
  onColumnUpdate?: (
    columnId: string,
    updates: Partial<{
      label: string;
      variant: CellOpts["variant"];
      prompt: string;
    }>,
  ) => void;
  onColumnDelete?: (columnId: string) => void;
  onEnrichColumn?: (columnId: string, prompt: string) => void;
  children: React.ReactElement;
}

export const DataGridColumnConfig = <TData extends RowData>({
  column,
  onColumnUpdate,
  onColumnDelete,
  onEnrichColumn,
  children,
}: DataGridColumnConfigProps<TData>) => {
  const [open, setOpen] = React.useState(false);

  const { meta } = column.columnDef;
  const currentVariant = meta?.cell?.variant ?? "short-text";
  const { header } = column.columnDef;
  const currentLabel =
    meta?.label ?? (header === undefined || isFunction(header) ? column.id : header);
  const currentPrompt = meta?.prompt ?? "";

  const [config, setConfig] = React.useState<ColumnConfigState>({
    label: currentLabel,
    prompt: currentPrompt,
    variant: currentVariant,
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setConfig({
        label: currentLabel,
        prompt: currentPrompt,
        variant: currentVariant,
      });
    }
    setOpen(nextOpen);
  };

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig((prev) => ({ ...prev, label: e.target.value }));
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setConfig((prev) => ({ ...prev, prompt: e.target.value }));
  };

  const handleSave = () => {
    const updates: ColumnConfigUpdates = {};

    if (config.label !== currentLabel) {
      updates.label = config.label;
    }
    if (config.prompt !== currentPrompt) {
      updates.prompt = config.prompt;
    }

    if (Object.keys(updates).length > 0) {
      onColumnUpdate?.(column.id, updates);
    }
    setOpen(false);
  };

  const handleEnrich = () => {
    if (config.prompt.trim()) {
      onEnrichColumn?.(column.id, config.prompt);
    }
    setOpen(false);
  };

  const handleDelete = () => {
    onColumnDelete?.(column.id);
    setOpen(false);
  };

  const columnVariant = getColumnVariant(config.variant);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger render={children} />
      <PopoverContent align="start" className="w-72 space-y-4">
        {/* Column Name */}
        <div className="space-y-1.5">
          <label htmlFor={`col-name-${column.id}`} className="text-sm font-medium">
            Name
          </label>
          <Input
            id={`col-name-${column.id}`}
            value={config.label}
            onChange={handleLabelChange}
            placeholder="Column name"
          />
        </div>

        {/* Data Type (readonly) */}
        <div className="space-y-1.5">
          <span className="block text-sm font-medium">Data Type</span>
          <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-muted/50 text-sm">
            {columnVariant && <columnVariant.icon className="size-4 text-muted-foreground" />}
            <span>
              {CELL_VARIANTS.find((v) => v.value === config.variant)?.label ?? config.variant}
            </span>
          </div>
        </div>

        {/* AI Prompt */}
        <div className="space-y-1.5">
          <label htmlFor={`col-prompt-${column.id}`} className="text-sm font-medium">
            Prompt
          </label>
          <Textarea
            id={`col-prompt-${column.id}`}
            value={config.prompt}
            onChange={handlePromptChange}
            placeholder="Add specific instructions for the agent, e.g., 'Find the email from Apollo.'"
            className="min-h-20 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          {onEnrichColumn && config.prompt.trim() && (
            <Button variant="default" size="sm" className="flex-1" onClick={handleEnrich}>
              <SparklesIcon className="size-4 mr-1.5" />
              Enrich Column
            </Button>
          )}
          {!config.prompt.trim() && (
            <Button variant="default" size="sm" className="flex-1" onClick={handleSave}>
              Save
            </Button>
          )}
          {onColumnDelete && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleDelete}
              className="text-destructive hover:text-destructive"
            >
              <TrashIcon className="size-4" />
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
