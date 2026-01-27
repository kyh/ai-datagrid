"use client";

import type { Column, Table } from "@tanstack/react-table";
import { SparklesIcon, TrashIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { getColumnVariant } from "@/lib/data-grid";
import type { CellOpts } from "@/lib/data-grid-types";

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

interface ColumnConfigState {
  label: string;
  variant: CellOpts["variant"];
  prompt: string;
}

interface DataGridColumnConfigProps<TData> {
  column: Column<TData, unknown>;
  table: Table<TData>;
  onColumnUpdate?: (
    columnId: string,
    updates: Partial<{
      label: string;
      variant: CellOpts["variant"];
      prompt: string;
    }>
  ) => void;
  onColumnDelete?: (columnId: string) => void;
  onEnrichColumn?: (columnId: string, prompt: string) => void;
  children: React.ReactNode;
}

export function DataGridColumnConfig<TData>({
  column,
  onColumnUpdate,
  onColumnDelete,
  onEnrichColumn,
  children,
}: DataGridColumnConfigProps<TData>) {
  const [open, setOpen] = React.useState(false);

  const meta = column.columnDef.meta;
  const currentVariant = meta?.cell?.variant ?? "short-text";
  const currentLabel =
    meta?.label ??
    (typeof column.columnDef.header === "string"
      ? column.columnDef.header
      : column.id);
  const currentPrompt = meta?.prompt ?? "";

  const [config, setConfig] = React.useState<ColumnConfigState>({
    label: currentLabel,
    variant: currentVariant,
    prompt: currentPrompt,
  });

  // Reset state when popover opens
  React.useEffect(() => {
    if (open) {
      setConfig({
        label: currentLabel,
        variant: currentVariant,
        prompt: currentPrompt,
      });
    }
  }, [open, currentLabel, currentVariant, currentPrompt]);

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig((prev) => ({ ...prev, label: e.target.value }));
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setConfig((prev) => ({ ...prev, prompt: e.target.value }));
  };

  const handleSave = () => {
    const updates: Partial<{
      label: string;
      variant: CellOpts["variant"];
      prompt: string;
    }> = {};

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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-4">
        {/* Column Name */}
        <div className="space-y-1.5">
          <label
            htmlFor={`col-name-${column.id}`}
            className="text-sm font-medium"
          >
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
          <label className="text-sm font-medium">Data Type</label>
          <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-muted/50 text-sm">
            {columnVariant && (
              <columnVariant.icon className="size-4 text-muted-foreground" />
            )}
            <span>
              {CELL_VARIANTS.find((v) => v.value === config.variant)?.label ??
                config.variant}
            </span>
          </div>
        </div>

        {/* AI Prompt */}
        <div className="space-y-1.5">
          <label
            htmlFor={`col-prompt-${column.id}`}
            className="text-sm font-medium"
          >
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
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={handleEnrich}
            >
              <SparklesIcon className="size-4 mr-1.5" />
              Enrich Column
            </Button>
          )}
          {!config.prompt.trim() && (
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={handleSave}
            >
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
}
