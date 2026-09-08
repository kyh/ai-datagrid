import type { DataGridFeatures } from "@/lib/data-grid-features";
import type { ColumnDef } from "@tanstack/react-table";
import type { z } from "zod";

import type { columnDefinitionSchema } from "@/lib/assistant-schemas";
import { getFilterFn } from "@/lib/data-grid-filters";
import type { CellOpts, DataGridRowData } from "@/lib/data-grid-types";

type ColumnDefinition = z.infer<typeof columnDefinitionSchema>;

const filterFn = getFilterFn<DataGridRowData>();

/**
 * Maps an AI-generated column definition (the zod contract in
 * `@/lib/assistant-schemas`) to a TanStack Table ColumnDef.
 * Pure: no state, safe to call anywhere.
 */
export const columnDefinitionToColumnDef = (
  col: ColumnDefinition,
): ColumnDef<DataGridFeatures, DataGridRowData> => {
  let cell: CellOpts;
  switch (col.variant) {
    case "number": {
      cell = {
        variant: "number",
        ...(col.min !== undefined && { min: col.min }),
        ...(col.max !== undefined && { max: col.max }),
        ...(col.step !== undefined && { step: col.step }),
      };
      break;
    }
    case "select":
    case "multi-select": {
      cell = { options: col.options ?? [], variant: col.variant };
      break;
    }
    default: {
      cell = { variant: col.variant };
      break;
    }
  }

  return {
    accessorKey: col.id,
    filterFn,
    header: col.label,
    id: col.id,
    meta: {
      cell,
      label: col.label,
      ...(col.prompt && { prompt: col.prompt }),
    },
    minSize: 180,
  };
};
