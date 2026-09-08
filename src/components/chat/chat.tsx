"use client";

import type { DataGridFeatures } from "@/lib/data-grid-features";
import type { ColumnDef } from "@tanstack/react-table";
import type { MessageStreamEvent } from "eve/client";
import { useEveAgent } from "eve/react";
import { KeyIcon, SparklesIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { useLocalStorage } from "@/hooks/use-local-storage";
import type {
  ColumnUpdate,
  ExistingColumn,
  ExistingFilter,
  ExistingSort,
} from "@/lib/assistant-schemas";
import {
  addFiltersPayloadSchema,
  addSortsInputSchema,
  deleteColumnsInputSchema,
  enrichCellsPayloadSchema,
  generateColumnsInputSchema,
  removeFiltersInputSchema,
  removeSortsInputSchema,
  updateColumnsInputSchema,
} from "@/lib/assistant-schemas";
import { columnDefinitionToColumnDef } from "@/lib/column-mapping";
import type { CellUpdate, DataGridRowData, FilterValue } from "@/lib/data-grid-types";
import { buildGridContext } from "@/lib/grid-context";
import type { SelectionContext } from "@/lib/selection-context";
import { useDataGridStore } from "@/stores/data-grid-store";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "../ui/input-group";
import { Shimmer } from "../ui/shimmer";
import { ApiKeyDialog, GATEWAY_API_KEY_STORAGE_KEY } from "./api-key-dialog";

/**
 * BYO-key transport: the stored gateway key rides as a bearer header on
 * every eve request (the channel verifier hands it to the dynamic model
 * resolver and the enrich_cells tool). Read from localStorage on every
 * request — eve captures this resolver once at store creation, so React
 * state would go stale.
 */
const resolveAuthHeaders = (): Readonly<Record<string, string>> => {
  if (typeof window === "undefined") {
    return {};
  }
  const key = window.localStorage.getItem(GATEWAY_API_KEY_STORAGE_KEY);
  return key !== null && key.length > 0 ? { authorization: `Bearer ${key}` } : {};
};

// -----------------------------------------------------------------------------
// Tool results -> grid callbacks
//
// eve streams every tool result as an `action.result` event whose
// `data.result` is `{ kind: "tool-result", toolName, output, isError? }`,
// where `output` is the tool's full `execute` return value. Each payload is
// zod-parsed against the shared schemas before touching the grid.
// -----------------------------------------------------------------------------

const toolResultEventSchema = z.object({
  data: z.object({
    result: z.object({
      isError: z.boolean().optional(),
      kind: z.literal("tool-result"),
      output: z.unknown(),
      toolName: z.string(),
    }),
    status: z.enum(["completed", "failed", "rejected"]),
  }),
  type: z.literal("action.result"),
});

/** `subagent.event` wraps a child session's stream event under `data.event`. */
const subagentEventSchema = z.object({
  data: z.object({ event: z.unknown() }),
  type: z.literal("subagent.event"),
});

/**
 * Auth-shaped failures: a 401 from the channel (keyless in prod), a
 * rejected gateway key at the model call, or a missing server key in dev.
 * All of them route back to the key dialog.
 */
const isAuthError = (error: Error): boolean =>
  /unauthorized|forbidden|authentication|api.?key|credential|401|403/iu.test(error.message);

interface ChatProps {
  onColumnsGenerated?: (columns: ColumnDef<DataGridFeatures, DataGridRowData>[]) => void;
  onColumnsUpdated?: (updates: ColumnUpdate[]) => void;
  onColumnsDeleted?: (columnIds: string[]) => void;
  onDataEnriched?: (updates: CellUpdate[]) => void;
  onFiltersAdded?: (filters: { columnId: string; value: FilterValue }[]) => void;
  onFiltersRemoved?: (columnIds: string[]) => void;
  onFiltersCleared?: () => void;
  onSortsAdded?: (sorts: { columnId: string; desc: boolean }[]) => void;
  onSortsRemoved?: (columnIds: string[]) => void;
  onSortsCleared?: () => void;
  getSelectionContext?: () => SelectionContext | null;
  getExistingColumns?: () => ExistingColumn[];
  getExistingFilters?: () => ExistingFilter[];
  getExistingSorts?: () => ExistingSort[];
  hasSelection?: boolean;
  initialInput?: string;
}

type ToolResult = z.infer<typeof toolResultEventSchema>["data"]["result"];

/** Unwrap subagent envelopes and keep only completed, non-error tool results. */
const parseCompletedToolResult = (incoming: MessageStreamEvent): ToolResult | null => {
  // Delegation is forbidden by the instructions, but if the model strays,
  // unwrap the child's events so its tool results still reach the grid.
  let event: unknown = incoming;
  for (
    let wrapped = subagentEventSchema.safeParse(event);
    wrapped.success;
    wrapped = subagentEventSchema.safeParse(event)
  ) {
    const { event: inner } = wrapped.data.data;
    event = inner;
  }
  const parsed = toolResultEventSchema.safeParse(event);
  if (!parsed.success) {
    return null;
  }
  const { status, result } = parsed.data.data;
  if (status !== "completed" || result.isError === true) {
    return null;
  }
  return result;
};

const plural = (count: number, noun: string): string => `${count} ${noun}${count === 1 ? "" : "s"}`;

type ToolResultHandlers = Pick<
  ChatProps,
  | "onColumnsGenerated"
  | "onColumnsUpdated"
  | "onColumnsDeleted"
  | "onDataEnriched"
  | "onFiltersAdded"
  | "onFiltersRemoved"
  | "onFiltersCleared"
  | "onSortsAdded"
  | "onSortsRemoved"
  | "onSortsCleared"
> & {
  clearProgress: () => void;
  removeGeneratingCell: (cellKey: string) => void;
};

const applyGenerateColumns = (result: ToolResult, handlers: ToolResultHandlers): void => {
  const payload = generateColumnsInputSchema.safeParse(result.output);
  if (!payload.success) {
    return;
  }
  handlers.clearProgress();
  const { columns } = payload.data;
  if (handlers.onColumnsGenerated) {
    handlers.onColumnsGenerated(columns.map(columnDefinitionToColumnDef));
    toast.success(`Generated ${plural(columns.length, "column")}`);
  }
};

const applyUpdateColumns = (result: ToolResult, handlers: ToolResultHandlers): void => {
  const payload = updateColumnsInputSchema.safeParse(result.output);
  if (!payload.success) {
    return;
  }
  handlers.clearProgress();
  const { updates } = payload.data;
  if (updates.length > 0 && handlers.onColumnsUpdated) {
    handlers.onColumnsUpdated(updates);
    toast.success(`Updated ${plural(updates.length, "column")}`);
  }
};

const applyDeleteColumns = (result: ToolResult, handlers: ToolResultHandlers): void => {
  const payload = deleteColumnsInputSchema.safeParse(result.output);
  if (!payload.success) {
    return;
  }
  handlers.clearProgress();
  const { columnIds } = payload.data;
  if (columnIds.length > 0 && handlers.onColumnsDeleted) {
    handlers.onColumnsDeleted(columnIds);
    toast.success(`Deleted ${plural(columnIds.length, "column")}`);
  }
};

const applyEnrichCells = (result: ToolResult, handlers: ToolResultHandlers): void => {
  const payload = enrichCellsPayloadSchema.safeParse(result.output);
  if (!payload.success) {
    return;
  }
  handlers.clearProgress();
  const { updates, failures } = payload.data;
  if (updates.length > 0 && handlers.onDataEnriched) {
    handlers.onDataEnriched(
      updates.map((update) => ({
        columnId: update.columnId,
        rowIndex: update.rowIndex,
        value: update.value,
      })),
    );
    toast.success(`Updated ${plural(updates.length, "cell")}`);
  }
  // Clear the spinner state for every cell the tool reported on
  for (const cell of [...updates, ...failures]) {
    handlers.removeGeneratingCell(`${cell.rowIndex}:${cell.columnId}`);
  }
  if (failures.length > 0) {
    toast.error(`Failed to enrich ${plural(failures.length, "cell")}`);
  }
};

const applyAddFilters = (result: ToolResult, handlers: ToolResultHandlers): void => {
  // Parse through schema to apply transforms (cleans malformed values)
  const payload = addFiltersPayloadSchema.safeParse(result.output);
  if (!payload.success) {
    return;
  }
  handlers.clearProgress();
  const { filters } = payload.data;
  if (filters.length > 0 && handlers.onFiltersAdded) {
    handlers.onFiltersAdded(
      filters.map((f) => ({
        columnId: f.columnId,
        value: {
          endValue: f.endValue,
          operator: f.operator,
          value: f.value,
        },
      })),
    );
    toast.success(`Added ${plural(filters.length, "filter")}`);
  }
};

const applyRemoveFilters = (result: ToolResult, handlers: ToolResultHandlers): void => {
  const payload = removeFiltersInputSchema.safeParse(result.output);
  if (!payload.success) {
    return;
  }
  handlers.clearProgress();
  const { columnIds } = payload.data;
  if (columnIds.length > 0 && handlers.onFiltersRemoved) {
    handlers.onFiltersRemoved(columnIds);
    toast.success(`Removed ${plural(columnIds.length, "filter")}`);
  }
};

const applyClearFilters = (handlers: ToolResultHandlers): void => {
  handlers.clearProgress();
  if (handlers.onFiltersCleared) {
    handlers.onFiltersCleared();
    toast.success("Cleared all filters");
  }
};

const applyAddSorts = (result: ToolResult, handlers: ToolResultHandlers): void => {
  const payload = addSortsInputSchema.safeParse(result.output);
  if (!payload.success) {
    return;
  }
  handlers.clearProgress();
  const { sorts } = payload.data;
  if (sorts.length > 0 && handlers.onSortsAdded) {
    handlers.onSortsAdded(
      sorts.map((sort) => ({ columnId: sort.columnId, desc: sort.direction === "desc" })),
    );
    toast.success(`Added ${plural(sorts.length, "sort")}`);
  }
};

const applyRemoveSorts = (result: ToolResult, handlers: ToolResultHandlers): void => {
  const payload = removeSortsInputSchema.safeParse(result.output);
  if (!payload.success) {
    return;
  }
  handlers.clearProgress();
  const { columnIds } = payload.data;
  if (columnIds.length > 0 && handlers.onSortsRemoved) {
    handlers.onSortsRemoved(columnIds);
    toast.success(`Removed sorting from ${plural(columnIds.length, "column")}`);
  }
};

const applyClearSorts = (handlers: ToolResultHandlers): void => {
  handlers.clearProgress();
  if (handlers.onSortsCleared) {
    handlers.onSortsCleared();
    toast.success("Cleared all sorting");
  }
};

const applyToolResultToGrid = (result: ToolResult, handlers: ToolResultHandlers): void => {
  switch (result.toolName) {
    case "generate_columns": {
      applyGenerateColumns(result, handlers);
      break;
    }
    case "update_columns": {
      applyUpdateColumns(result, handlers);
      break;
    }
    case "delete_columns": {
      applyDeleteColumns(result, handlers);
      break;
    }
    case "enrich_cells": {
      applyEnrichCells(result, handlers);
      break;
    }
    case "add_filters": {
      applyAddFilters(result, handlers);
      break;
    }
    case "remove_filters": {
      applyRemoveFilters(result, handlers);
      break;
    }
    case "clear_filters": {
      applyClearFilters(handlers);
      break;
    }
    case "add_sorts": {
      applyAddSorts(result, handlers);
      break;
    }
    case "remove_sorts": {
      applyRemoveSorts(result, handlers);
      break;
    }
    case "clear_sorts": {
      applyClearSorts(handlers);
      break;
    }
    default: {
      break;
    }
  }
};

export const Chat = ({
  onColumnsGenerated,
  onColumnsUpdated,
  onColumnsDeleted,
  onDataEnriched,
  onFiltersAdded,
  onFiltersRemoved,
  onFiltersCleared,
  onSortsAdded,
  onSortsRemoved,
  onSortsCleared,
  getSelectionContext,
  getExistingColumns,
  getExistingFilters,
  getExistingSorts,
  hasSelection = false,
  initialInput = "",
}: ChatProps = {}) => {
  // Use Zustand store for generating cells state
  const { setGeneratingCells, removeGeneratingCell } = useDataGridStore();
  // AI Prompt state
  const [input, setInput] = useState(initialInput);
  const [progress, setProgress] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKey, , removeApiKey] = useLocalStorage(GATEWAY_API_KEY_STORAGE_KEY, "");

  const applyToolResult = useCallback(
    (incoming: MessageStreamEvent): void => {
      const result = parseCompletedToolResult(incoming);
      if (result === null) {
        return;
      }
      applyToolResultToGrid(result, {
        clearProgress: () => setProgress(null),
        onColumnsDeleted,
        onColumnsGenerated,
        onColumnsUpdated,
        onDataEnriched,
        onFiltersAdded,
        onFiltersCleared,
        onFiltersRemoved,
        onSortsAdded,
        onSortsCleared,
        onSortsRemoved,
        removeGeneratingCell,
      });
    },
    [
      onColumnsGenerated,
      onColumnsUpdated,
      onColumnsDeleted,
      onDataEnriched,
      onFiltersAdded,
      onFiltersRemoved,
      onFiltersCleared,
      onSortsAdded,
      onSortsRemoved,
      onSortsCleared,
      removeGeneratingCell,
    ],
  );

  const agent = useEveAgent({
    headers: resolveAuthHeaders,
    onError: (error) => {
      if (isAuthError(error)) {
        removeApiKey();
        toast.error("Invalid API key. Please enter a valid Vercel Gateway API key.");
        setShowApiKeyModal(true);
      } else {
        toast.error(error.message || "Something went wrong");
      }
    },
    onEvent: applyToolResult,
    // The turn is over (success, failure or cancellation): drop the shimmer and
    // any cell spinners the enrich flow left behind (e.g. the model never called
    // enrich_cells, or the turn errored mid-flight).
    onFinish: () => {
      setProgress(null);
      setGeneratingCells(new Set());
    },
  });
  const { status } = agent;

  const isLoading = status === "submitted" || status === "streaming";

  const needsKey = !apiKey && process.env.NODE_ENV !== "development";

  const handleTextareaFocus = () => {
    // Skip modal in local dev (env var handles auth server-side)
    if (needsKey) {
      setShowApiKeyModal(true);
    }
  };

  const handleSubmit = useCallback(
    (e: { preventDefault: () => void }) => {
      e.preventDefault();
      if (isLoading) {
        return;
      }
      if (!input.trim() && !hasSelection) {
        return;
      }
      if (needsKey) {
        setShowApiKeyModal(true);
        return;
      }

      const selection = getSelectionContext?.() ?? null;

      // Set generating cells before sending. Per-cell streaming is gone
      // (enrich_cells returns one batch), so this is a coarse spinner the
      // tool result (or turn end) clears.
      if (selection) {
        const cellKeys = new Set(selection.selectedCells.map((c) => `${c.rowIndex}:${c.columnId}`));
        setGeneratingCells(cellKeys);
        setProgress(`Enriching ${cellKeys.size} cell${cellKeys.size === 1 ? "" : "s"}...`);
      } else {
        setProgress("Processing...");
      }

      // Single-turn semantics (the old `setMessages([])`): every submit
      // starts a fresh session; state arrives via clientContext anyway.
      agent.reset();
      const send = async () => {
        try {
          await agent.send(input.trim() || "Enrich selected cells", {
            clientContext: buildGridContext({
              columns: getExistingColumns?.() ?? [],
              filters: getExistingFilters?.() ?? [],
              selection,
              sorts: getExistingSorts?.() ?? [],
            }),
          });
        } catch {
          // failures surface via status/error/onError
        }
      };
      void send();
      setInput("");
    },
    [
      input,
      isLoading,
      hasSelection,
      needsKey,
      agent,
      getSelectionContext,
      getExistingColumns,
      getExistingFilters,
      getExistingSorts,
      setGeneratingCells,
    ],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if ((input.trim() || hasSelection) && !isLoading) {
        handleSubmit(e);
      }
    }
  };

  return (
    <>
      <div
        className="fixed bottom-3 left-1/2 z-50 -translate-x-1/2 w-full max-w-lg px-3"
        data-grid-chat
      >
        {progress && (
          <div className="mb-2 px-4">
            <Shimmer className="text-xs">{progress}</Shimmer>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <InputGroup className="border border-border/50 supports-backdrop-filter:bg-background/80 bg-background/95 backdrop-blur shadow rounded-[1.25rem]">
            <InputGroupTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={handleTextareaFocus}
              onKeyDown={handleKeyDown}
              placeholder="Generate, or enrich..."
              disabled={isLoading}
            />
            <InputGroupAddon align="block-end">
              <InputGroupButton
                variant="outline"
                className="rounded-full"
                size="icon-xs"
                type="button"
                onClick={() => setShowApiKeyModal(true)}
              >
                <KeyIcon className="size-3" />
              </InputGroupButton>
              <InputGroupButton
                variant="default"
                className="ml-auto rounded-full"
                size="sm"
                type="submit"
                disabled={(!input.trim() && !hasSelection) || isLoading}
              >
                {hasSelection ? "Enrich" : "Generate"}
                <SparklesIcon className="size-3" />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </form>
      </div>
      <ApiKeyDialog open={showApiKeyModal} onOpenChange={setShowApiKeyModal} />
    </>
  );
};
