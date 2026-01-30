"use client";

import { PlusIcon, XIcon } from "lucide-react";
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

const MAX_UNIQUE_VALUE_ATTEMPTS = 1000;

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

function createDefaultValues(initial?: Partial<ColumnFormValues>): ColumnFormValues {
  return {
    label: initial?.label ?? "",
    variant: initial?.variant ?? "short-text",
    options: initial?.options ?? [],
    prompt: initial?.prompt ?? "",
  };
}

export function ColumnForm({
  mode,
  initialValues,
  onSubmit,
  onChange,
  submitLabel,
  autoFocus = true,
}: ColumnFormProps) {
  const [values, setValues] = React.useState<ColumnFormValues>(() =>
    createDefaultValues(initialValues)
  );
  const [newOptionLabel, setNewOptionLabel] = React.useState("");

  // Keep ref in sync for parent to read on close
  const valuesRef = React.useRef(values);
  valuesRef.current = values;

  // Notify parent only when values change
  const prevValuesRef = React.useRef(values);
  React.useEffect(() => {
    if (prevValuesRef.current !== values) {
      prevValuesRef.current = values;
      onChange?.(values);
    }
  }, [values, onChange]);

  const columnVariant = getColumnVariant(values.variant);
  const isSelectType = values.variant === "select" || values.variant === "multi-select";

  const updateValues = React.useCallback(
    (updates: Partial<ColumnFormValues>) => {
      setValues((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const handleSubmit = React.useCallback(() => {
    if (!values.label.trim()) return;
    onSubmit?.({
      ...values,
      label: values.label.trim(),
      prompt: values.prompt.trim(),
    });
  }, [values, onSubmit]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && values.label.trim()) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit, values.label]
  );

  const handleAddOption = React.useCallback(() => {
    const trimmedLabel = newOptionLabel.trim();
    if (!trimmedLabel) return;

    const baseValue = trimmedLabel
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "") || "option";

    let uniqueValue = baseValue;
    let counter = 1;
    while (
      values.options.some((opt) => opt.value === uniqueValue) &&
      counter < MAX_UNIQUE_VALUE_ATTEMPTS
    ) {
      uniqueValue = `${baseValue}-${counter}`;
      counter++;
    }

    updateValues({
      options: [...values.options, { label: trimmedLabel, value: uniqueValue }],
    });
    setNewOptionLabel("");
  }, [newOptionLabel, values.options, updateValues]);

  const handleRemoveOption = React.useCallback(
    (valueToRemove: string) => {
      updateValues({
        options: values.options.filter((opt) => opt.value !== valueToRemove),
      });
    },
    [values.options, updateValues]
  );

  const handleUpdateOptionLabel = React.useCallback(
    (value: string, newLabel: string) => {
      updateValues({
        options: values.options.map((opt) =>
          opt.value === value ? { ...opt, label: newLabel } : opt
        ),
      });
    },
    [values.options, updateValues]
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

  const handleVariantChange = React.useCallback(
    (newVariant: string) => {
      const variant = newVariant as CellOpts["variant"];
      // Clear options when changing away from select types
      if (variant !== "select" && variant !== "multi-select") {
        updateValues({ variant, options: [] });
      } else {
        updateValues({ variant });
      }
    },
    [updateValues]
  );

  return (
    <div className="space-y-3 p-3">
      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">Name</span>
        <Input
          value={values.label}
          onChange={(e) => updateValues({ label: e.target.value })}
          onKeyDown={handleKeyDown}
          placeholder="Column name"
          className="h-8"
          autoFocus={autoFocus}
        />
      </div>

      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">Data Type</span>
        {mode === "add" ? (
          <Select value={values.variant} onValueChange={handleVariantChange}>
            <SelectTrigger className="h-8 w-full">
              <SelectValue>
                {columnVariant && (
                  <span className="flex items-center gap-2">
                    <columnVariant.icon className="size-4 text-muted-foreground" />
                    {CELL_VARIANTS.find((v) => v.value === values.variant)?.label ??
                      values.variant}
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
              {CELL_VARIANTS.find((v) => v.value === values.variant)?.label ??
                values.variant}
            </span>
          </div>
        )}
      </div>

      {isSelectType && (
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">Options</span>
          <div className="space-y-1.5">
            {values.options.map((option) => (
              <div key={option.value} className="flex items-center gap-1">
                <Input
                  value={option.label}
                  onChange={(e) => handleUpdateOptionLabel(option.value, e.target.value)}
                  aria-label={`Option: ${option.label}`}
                  className="h-7 flex-1 text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={() => handleRemoveOption(option.value)}
                  aria-label={`Remove option: ${option.label}`}
                >
                  <XIcon className="size-3.5" />
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-1">
              <Input
                value={newOptionLabel}
                onChange={(e) => setNewOptionLabel(e.target.value)}
                onKeyDown={handleOptionKeyDown}
                placeholder="Add option..."
                aria-label="New option name"
                className="h-7 flex-1 text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                onClick={handleAddOption}
                disabled={!newOptionLabel.trim()}
                aria-label="Add option"
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
          value={values.prompt}
          onChange={(e) => updateValues({ prompt: e.target.value })}
          placeholder="Instructions for AI enrichment"
          className="min-h-16 resize-none text-sm"
        />
      </div>

      {submitLabel && (
        <Button
          size="sm"
          className="w-full"
          onClick={handleSubmit}
          disabled={!values.label.trim()}
        >
          {submitLabel}
        </Button>
      )}
    </div>
  );
}
