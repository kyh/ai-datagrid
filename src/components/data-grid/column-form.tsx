"use client";

import { GripVerticalIcon, PlusIcon, XIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export interface ColumnFormValues {
  label: string;
  variant: CellOpts["variant"];
  options: CellSelectOption[];
  prompt: string;
}

interface ColumnFormProps {
  mode: "add" | "edit";
  initialValues?: Partial<ColumnFormValues>;
  onSubmit?: (values: ColumnFormValues) => void;
  onChange?: (values: ColumnFormValues) => void;
  submitLabel?: string;
  autoFocus?: boolean;
}

export function ColumnForm({
  mode,
  initialValues,
  onSubmit,
  onChange,
  submitLabel,
  autoFocus = true,
}: ColumnFormProps) {
  const [label, setLabel] = React.useState(initialValues?.label ?? "");
  const [variant, setVariant] = React.useState<CellOpts["variant"]>(
    initialValues?.variant ?? "short-text"
  );
  const [options, setOptions] = React.useState<CellSelectOption[]>(
    initialValues?.options ?? []
  );
  const [prompt, setPrompt] = React.useState(initialValues?.prompt ?? "");
  const [newOptionLabel, setNewOptionLabel] = React.useState("");

  const columnVariant = getColumnVariant(variant);
  const isSelectType = variant === "select" || variant === "multi-select";

  // Notify parent of changes (for edit mode)
  React.useEffect(() => {
    onChange?.({ label, variant, options, prompt });
  }, [label, variant, options, prompt, onChange]);

  const handleSubmit = React.useCallback(() => {
    if (!label.trim()) return;
    onSubmit?.({ label: label.trim(), variant, options, prompt: prompt.trim() });
  }, [label, variant, options, prompt, onSubmit]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && label.trim()) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit, label]
  );

  const handleAddOption = React.useCallback(() => {
    const trimmedLabel = newOptionLabel.trim();
    if (!trimmedLabel) return;

    const value = trimmedLabel
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    let uniqueValue = value;
    let counter = 1;
    while (options.some((opt) => opt.value === uniqueValue)) {
      uniqueValue = `${value}-${counter}`;
      counter++;
    }

    setOptions((prev) => [...prev, { label: trimmedLabel, value: uniqueValue }]);
    setNewOptionLabel("");
  }, [newOptionLabel, options]);

  const handleRemoveOption = React.useCallback((valueToRemove: string) => {
    setOptions((prev) => prev.filter((opt) => opt.value !== valueToRemove));
  }, []);

  const handleUpdateOptionLabel = React.useCallback(
    (value: string, newLabel: string) => {
      setOptions((prev) =>
        prev.map((opt) => (opt.value === value ? { ...opt, label: newLabel } : opt))
      );
    },
    []
  );

  const handleOptionKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        handleAddOption();
      }
    },
    [handleAddOption]
  );

  return (
    <div className="space-y-3 p-3">
      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">Name</span>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Column name"
          className="h-8"
          autoFocus={autoFocus}
        />
      </div>

      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">Data Type</span>
        {mode === "add" ? (
          <Select
            value={variant}
            onValueChange={(v) => {
              setVariant(v as CellOpts["variant"]);
              // Clear options when changing away from select types
              if (v !== "select" && v !== "multi-select") {
                setOptions([]);
              }
            }}
          >
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
        ) : (
          <div className="flex h-8 w-full items-center gap-2 rounded-md border bg-muted/50 px-2 text-sm">
            {columnVariant && (
              <columnVariant.icon className="size-4 text-muted-foreground" />
            )}
            <span>
              {CELL_VARIANTS.find((v) => v.value === variant)?.label ?? variant}
            </span>
          </div>
        )}
      </div>

      {isSelectType && (
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">Options</span>
          <div className="space-y-1.5">
            {options.map((option) => (
              <div key={option.value} className="flex items-center gap-1">
                <GripVerticalIcon className="size-3 shrink-0 text-muted-foreground/50" />
                <Input
                  value={option.label}
                  onChange={(e) => handleUpdateOptionLabel(option.value, e.target.value)}
                  className="h-7 flex-1 text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={() => handleRemoveOption(option.value)}
                >
                  <XIcon className="size-3.5" />
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-1">
              <div className="w-3 shrink-0" />
              <Input
                value={newOptionLabel}
                onChange={(e) => setNewOptionLabel(e.target.value)}
                onKeyDown={handleOptionKeyDown}
                placeholder="Add option..."
                className="h-7 flex-1 text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                onClick={handleAddOption}
                disabled={!newOptionLabel.trim()}
              >
                <PlusIcon className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
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

      {submitLabel && (
        <Button
          size="sm"
          className="w-full"
          onClick={handleSubmit}
          disabled={!label.trim()}
        >
          {submitLabel}
        </Button>
      )}
    </div>
  );
}
