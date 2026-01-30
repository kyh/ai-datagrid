"use client";

import { PlusIcon, XIcon } from "lucide-react";
import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";

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

export interface ColumnFormRef {
  getValues: () => ColumnFormValues;
  reset: () => void;
}

interface ColumnFormProps {
  mode: "add" | "edit";
  defaultValues?: Partial<ColumnFormValues>;
  onSubmit?: (values: ColumnFormValues) => void;
  submitLabel?: string;
  autoFocus?: boolean;
}

export const ColumnForm = React.forwardRef<ColumnFormRef, ColumnFormProps>(
  function ColumnForm(
    { mode, defaultValues, onSubmit, submitLabel, autoFocus = true },
    ref
  ) {
    const form = useForm<ColumnFormValues>({
      defaultValues: {
        label: defaultValues?.label ?? "",
        variant: defaultValues?.variant ?? "short-text",
        options: defaultValues?.options ?? [],
        prompt: defaultValues?.prompt ?? "",
      },
    });

    const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: "options",
    });

    const [newOptionLabel, setNewOptionLabel] = React.useState("");
    const newOptionInputRef = React.useRef<HTMLInputElement>(null);

    const variant = form.watch("variant");
    const columnVariant = getColumnVariant(variant);
    const isSelectType = variant === "select" || variant === "multi-select";

    // Expose methods to parent
    React.useImperativeHandle(
      ref,
      () => ({
        getValues: () => form.getValues(),
        reset: () => {
          form.reset();
          setNewOptionLabel("");
        },
      }),
      [form]
    );

    const handleSubmit = form.handleSubmit((values) => {
      onSubmit?.({
        ...values,
        label: values.label.trim(),
        prompt: values.prompt.trim(),
      });
    });

    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey && form.getValues("label").trim()) {
          e.preventDefault();
          handleSubmit();
        }
      },
      [form, handleSubmit]
    );

    const handleAddOption = React.useCallback(() => {
      const trimmedLabel = newOptionLabel.trim();
      if (!trimmedLabel) return;

      const baseValue =
        trimmedLabel
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "") || "option";

      const currentOptions = form.getValues("options");
      let uniqueValue = baseValue;
      let counter = 1;
      while (
        currentOptions.some((opt) => opt.value === uniqueValue) &&
        counter < MAX_UNIQUE_VALUE_ATTEMPTS
      ) {
        uniqueValue = `${baseValue}-${counter}`;
        counter++;
      }

      append({ label: trimmedLabel, value: uniqueValue });
      setNewOptionLabel("");
      // Refocus the input after adding
      requestAnimationFrame(() => {
        newOptionInputRef.current?.focus();
      });
    }, [newOptionLabel, form, append]);

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
        const v = newVariant as CellOpts["variant"];
        form.setValue("variant", v);
        // Clear options when changing away from select types
        if (v !== "select" && v !== "multi-select") {
          form.setValue("options", []);
        }
      },
      [form]
    );

    return (
      <form onSubmit={handleSubmit} className="space-y-3 p-3">
        <div className="space-y-1">
          <label htmlFor="column-name" className="text-xs text-muted-foreground">
            Name
          </label>
          <Input
            id="column-name"
            {...form.register("label")}
            onKeyDown={handleKeyDown}
            placeholder="Column name"
            className="h-8"
            autoFocus={autoFocus}
          />
        </div>

        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Data Type</span>
          {mode === "add" ? (
            <Select value={variant} onValueChange={handleVariantChange}>
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
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-1">
                  <input
                    type="hidden"
                    {...form.register(`options.${index}.value`)}
                  />
                  <Input
                    {...form.register(`options.${index}.label`)}
                    aria-label={`Option ${index + 1}`}
                    className="h-7 flex-1 text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    onClick={() => remove(index)}
                    aria-label={`Remove option ${index + 1}`}
                  >
                    <XIcon className="size-3.5" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center gap-1">
                <Input
                  ref={newOptionInputRef}
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
          <label htmlFor="column-prompt" className="text-xs text-muted-foreground">
            Prompt
          </label>
          <Textarea
            id="column-prompt"
            {...form.register("prompt")}
            placeholder="Instructions for AI enrichment"
            className="min-h-16 resize-none text-sm"
          />
        </div>

        {submitLabel && (
          <Button
            type="submit"
            size="sm"
            className="w-full"
            disabled={!form.watch("label").trim()}
          >
            {submitLabel}
          </Button>
        )}
      </form>
    );
  }
);
