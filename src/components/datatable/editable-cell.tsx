"use client";

import React from "react";
import { Input } from "@/src/components/ui/input";

import type { Column, Row } from "@tanstack/react-table";
import { useSpreadsheetStore } from "@/src/lib/spreadsheet-store";

interface SpreadsheetRow {
  id: string;
  [key: string]: unknown;
}

interface EditableCellProps<TData extends SpreadsheetRow = SpreadsheetRow> {
  getValue: () => unknown;
  row: Row<TData>;
  column: Column<TData, unknown>;
}

export const EditableCell = <TData extends SpreadsheetRow = SpreadsheetRow>({
  getValue,
  row,
  column,
}: EditableCellProps<TData>) => {
  const editingCell = useSpreadsheetStore((state) => state.editingCell);
  const setEditingCell = useSpreadsheetStore((state) => state.setEditingCell);
  const updateData = useSpreadsheetStore((state) => state.updateData);
  const value = getValue() as string;
  const isEditing =
    editingCell?.rowId === row.original.id &&
    editingCell?.columnId === column.id;

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateData(row.original.id, column.id, e.target.value);
  };

  const onBlur = () => {
    setEditingCell(null);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "Escape") {
      setEditingCell(null);
    }
    e.stopPropagation();
  };

  if (isEditing) {
    return (
      <Input
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className="h-8 w-full rounded-none border-0 bg-transparent p-1 text-sm focus-visible:ring-blue-600/20 dark:focus-visible:ring-blue-400/30"
        autoFocus
      />
    );
  }

  return (
    <div className="h-8 w-full p-1">
      <span className="text-foreground block truncate text-sm" title={value}>
        {value}
      </span>
    </div>
  );
};
