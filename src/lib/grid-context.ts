import { z } from "zod";

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

/**
 * Parses arbitrary cell values into JSON. `z.number()` (zod 4) admits only
 * finite numbers, so non-serializable leaves (functions, symbols, non-finite
 * numbers) fail the parse and are dropped — eve's client-context boundary
 * rejects lossy values outright, so sanitize instead of throwing.
 */
const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.boolean(),
    z.number(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

/** A selection row as the schema types it: raw values keyed by column id. */
type ContextRowSource = NonNullable<SelectionContext["rowData"]>[string];

const toContextRow = (row: ContextRowSource) => {
  const entries: Record<string, JsonValue> = {};
  for (const [key, item] of Object.entries(row)) {
    if (item instanceof Date) {
      // A pasted `Date` cell has no JSON contract; ship the empty object the
      // serializer always produced for it rather than inventing one.
      entries[key] = {};
      continue;
    }
    const json = jsonValueSchema.safeParse(item);
    if (json.success) entries[key] = json.data;
  }
  return entries;
};

/** Strips column options to their serializable `{label, value}` core (grid
 * column meta may carry React icon components on options). */
const toContextColumn = (column: ExistingColumn) => ({
  id: column.id,
  label: column.label,
  variant: column.variant,
  ...(column.prompt !== undefined ? { prompt: column.prompt } : undefined),
  ...(column.options !== undefined
    ? { options: column.options.map((o) => ({ label: o.label, value: o.value })) }
    : undefined),
});

const toContextSelection = (selection: SelectionContext) => {
  const rowData: Record<string, JsonValue> = {};
  for (const [rowIndex, row] of Object.entries(selection.rowData ?? {})) {
    rowData[rowIndex] = toContextRow(row);
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
