"use client";

import { GripVerticalIcon, PlusIcon, XIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CellSelectOption } from "@/lib/data-grid-types";

interface SelectOptionsEditorProps {
  options: CellSelectOption[];
  onChange: (options: CellSelectOption[]) => void;
}

export function SelectOptionsEditor({
  options,
  onChange,
}: SelectOptionsEditorProps) {
  const [newOptionLabel, setNewOptionLabel] = React.useState("");

  const handleAddOption = React.useCallback(() => {
    const trimmedLabel = newOptionLabel.trim();
    if (!trimmedLabel) return;

    // Generate a unique value from the label
    const value = trimmedLabel
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    // Ensure uniqueness
    let uniqueValue = value;
    let counter = 1;
    while (options.some((opt) => opt.value === uniqueValue)) {
      uniqueValue = `${value}-${counter}`;
      counter++;
    }

    onChange([...options, { label: trimmedLabel, value: uniqueValue }]);
    setNewOptionLabel("");
  }, [newOptionLabel, options, onChange]);

  const handleRemoveOption = React.useCallback(
    (valueToRemove: string) => {
      onChange(options.filter((opt) => opt.value !== valueToRemove));
    },
    [options, onChange]
  );

  const handleUpdateOptionLabel = React.useCallback(
    (value: string, newLabel: string) => {
      onChange(
        options.map((opt) =>
          opt.value === value ? { ...opt, label: newLabel } : opt
        )
      );
    },
    [options, onChange]
  );

  const handleKeyDown = React.useCallback(
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
    <div className="space-y-2">
      <span className="text-xs text-muted-foreground">Options</span>
      <div className="space-y-1.5">
        {options.map((option) => (
          <div key={option.value} className="flex items-center gap-1">
            <GripVerticalIcon className="size-3 shrink-0 text-muted-foreground/50" />
            <Input
              value={option.label}
              onChange={(e) =>
                handleUpdateOptionLabel(option.value, e.target.value)
              }
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
            onKeyDown={handleKeyDown}
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
  );
}
