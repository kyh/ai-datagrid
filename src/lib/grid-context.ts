import type { ExistingColumn, ExistingFilter, ExistingSort } from "./assistant-schemas";
import type { SelectionContext } from "./selection-context";

/**
 * Per-turn grid state the client ships as eve `clientContext` on every
 * `send()`. The server is stateless — this is how the agent sees the
 * spreadsheet. The shape is documented in agent/instructions.md
 * ("Per-turn context"); keep the two in sync.
 */

/** Structural JSON type, assignable to eve's `JsonObject` client context. */
type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Narrows arbitrary cell values to JSON. Non-serializable leaves (functions,
 * symbols, non-finite numbers) are dropped — eve's client-context boundary
 * rejects lossy values outright, so sanitize instead of throwing.
 */
const toJsonValue = (value: unknown): JsonValue | undefined => {
  if (value === null) return null;
  switch (typeof value) {
    case "string":
      return value;
    case "boolean":
      return value;
    case "number":
      return Number.isFinite(value) ? value : undefined;
    default:
      break;
  }
  if (Array.isArray(value)) {
    const items: JsonValue[] = [];
    for (const item of value) {
      const json = toJsonValue(item);
      if (json !== undefined) items.push(json);
    }
    return items;
  }
  if (isRecord(value)) {
    const entries: Record<string, JsonValue> = {};
    for (const [key, item] of Object.entries(value)) {
      const json = toJsonValue(item);
      if (json !== undefined) entries[key] = json;
    }
    return entries;
  }
  return undefined;
};

/** Strips column options to their serializable `{label, value}` core (grid
 * column meta may carry React icon components on options). */
const toContextColumn = (column: ExistingColumn) => ({
  id: column.id,
  label: column.label,
  variant: column.variant,
  ...(column.prompt !== undefined ? { prompt: column.prompt } : {}),
  ...(column.options !== undefined
    ? { options: column.options.map((o) => ({ label: o.label, value: o.value })) }
    : {}),
});

const toContextSelection = (selection: SelectionContext) => {
  const rowData: Record<string, JsonValue> = {};
  for (const [rowIndex, row] of Object.entries(selection.rowData ?? {})) {
    const json = toJsonValue(row);
    if (json !== undefined) rowData[rowIndex] = json;
  }
  return {
    selectedCells: selection.selectedCells,
    bounds: selection.bounds,
    currentColumns: selection.currentColumns.map(toContextColumn),
    rowData,
  };
};

type BuildGridContextInput = {
  columns: ExistingColumn[];
  filters: ExistingFilter[];
  sorts: ExistingSort[];
  selection: SelectionContext | null;
};

export const buildGridContext = ({
  columns,
  filters,
  sorts,
  selection,
}: BuildGridContextInput) => ({
  columns: columns.map(toContextColumn),
  filters,
  sorts,
  selection: selection === null ? null : toContextSelection(selection),
});
