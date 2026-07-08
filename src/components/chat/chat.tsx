"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useEveAgent } from "eve/react";
import { KeyIcon, SparklesIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
import type { CellUpdate, FilterValue } from "@/lib/data-grid-types";
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
  if (typeof window === "undefined") return {};
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
  type: z.literal("action.result"),
  data: z.object({
    status: z.enum(["completed", "failed", "rejected"]),
    result: z.object({
      kind: z.literal("tool-result"),
      toolName: z.string(),
      output: z.unknown(),
      isError: z.boolean().optional(),
    }),
  }),
});

/** `subagent.event` wraps a child session's stream event under `data.event`. */
const subagentEventSchema = z.object({
  type: z.literal("subagent.event"),
  data: z.object({ event: z.unknown() }),
});

/**
 * Auth-shaped failures: a 401 from the channel (keyless in prod), a
 * rejected gateway key at the model call, or a missing server key in dev.
 * All of them route back to the key dialog.
 */
const isAuthError = (error: Error): boolean =>
  /unauthorized|forbidden|authentication|api.?key|credential|401|403/i.test(error.message);

interface ChatProps {
  onColumnsGenerated?: (columns: ColumnDef<unknown>[]) => void;
  onColumnsUpdated?: (updates: ColumnUpdate[]) => void;
  onColumnsDeleted?: (columnIds: string[]) => void;
  onDataEnriched?: (updates: CellUpdate[]) => void;
  onFiltersAdded?: (filters: Array<{ columnId: string; value: FilterValue }>) => void;
  onFiltersRemoved?: (columnIds: string[]) => void;
  onFiltersCleared?: () => void;
  onSortsAdded?: (sorts: Array<{ columnId: string; desc: boolean }>) => void;
  onSortsRemoved?: (columnIds: string[]) => void;
  onSortsCleared?: () => void;
  getSelectionContext?: () => SelectionContext | null;
  getExistingColumns?: () => ExistingColumn[];
  getExistingFilters?: () => ExistingFilter[];
  getExistingSorts?: () => ExistingSort[];
  hasSelection?: boolean;
  initialInput?: string;
}

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
    (event: unknown): void => {
      // Delegation is forbidden by the instructions, but if the model strays,
      // unwrap the child's events so its tool results still reach the grid.
      const wrapped = subagentEventSchema.safeParse(event);
      if (wrapped.success) {
        applyToolResult(wrapped.data.data.event);
        return;
      }
      const parsed = toolResultEventSchema.safeParse(event);
      if (!parsed.success) return;
      const { status, result } = parsed.data.data;
      if (status !== "completed" || result.isError === true) return;

      switch (result.toolName) {
        case "generate_columns": {
          const payload = generateColumnsInputSchema.safeParse(result.output);
          if (!payload.success) return;
          setProgress(null);
          const { columns } = payload.data;
          if (onColumnsGenerated) {
            onColumnsGenerated(columns.map(columnDefinitionToColumnDef));
            toast.success(`Generated ${columns.length} column${columns.length !== 1 ? "s" : ""}`);
          }
          break;
        }
        case "update_columns": {
          const payload = updateColumnsInputSchema.safeParse(result.output);
          if (!payload.success) return;
          setProgress(null);
          const { updates } = payload.data;
          if (updates.length > 0 && onColumnsUpdated) {
            onColumnsUpdated(updates);
            toast.success(`Updated ${updates.length} column${updates.length !== 1 ? "s" : ""}`);
          }
          break;
        }
        case "delete_columns": {
          const payload = deleteColumnsInputSchema.safeParse(result.output);
          if (!payload.success) return;
          setProgress(null);
          const { columnIds } = payload.data;
          if (columnIds.length > 0 && onColumnsDeleted) {
            onColumnsDeleted(columnIds);
            toast.success(`Deleted ${columnIds.length} column${columnIds.length !== 1 ? "s" : ""}`);
          }
          break;
        }
        case "enrich_cells": {
          const payload = enrichCellsPayloadSchema.safeParse(result.output);
          if (!payload.success) return;
          setProgress(null);
          const { updates, failures } = payload.data;
          if (updates.length > 0 && onDataEnriched) {
            onDataEnriched(
              updates.map((update) => ({
                rowIndex: update.rowIndex,
                columnId: update.columnId,
                value: update.value,
              })),
            );
            toast.success(`Updated ${updates.length} cell${updates.length !== 1 ? "s" : ""}`);
          }
          // Clear the spinner state for every cell the tool reported on
          for (const cell of [...updates, ...failures]) {
            removeGeneratingCell(`${cell.rowIndex}:${cell.columnId}`);
          }
          if (failures.length > 0) {
            toast.error(
              `Failed to enrich ${failures.length} cell${failures.length !== 1 ? "s" : ""}`,
            );
          }
          break;
        }
        case "add_filters": {
          // Parse through schema to apply transforms (cleans malformed values)
          const payload = addFiltersPayloadSchema.safeParse(result.output);
          if (!payload.success) return;
          setProgress(null);
          const { filters } = payload.data;
          if (filters.length > 0 && onFiltersAdded) {
            onFiltersAdded(
              filters.map((f) => ({
                columnId: f.columnId,
                value: {
                  operator: f.operator,
                  value: f.value,
                  endValue: f.endValue,
                },
              })),
            );
            toast.success(`Added ${filters.length} filter${filters.length !== 1 ? "s" : ""}`);
          }
          break;
        }
        case "remove_filters": {
          const payload = removeFiltersInputSchema.safeParse(result.output);
          if (!payload.success) return;
          setProgress(null);
          const { columnIds } = payload.data;
          if (columnIds.length > 0 && onFiltersRemoved) {
            onFiltersRemoved(columnIds);
            toast.success(`Removed ${columnIds.length} filter${columnIds.length !== 1 ? "s" : ""}`);
          }
          break;
        }
        case "clear_filters": {
          setProgress(null);
          if (onFiltersCleared) {
            onFiltersCleared();
            toast.success("Cleared all filters");
          }
          break;
        }
        case "add_sorts": {
          const payload = addSortsInputSchema.safeParse(result.output);
          if (!payload.success) return;
          setProgress(null);
          const { sorts } = payload.data;
          if (sorts.length > 0 && onSortsAdded) {
            onSortsAdded(
              sorts.map((s) => ({ columnId: s.columnId, desc: s.direction === "desc" })),
            );
            toast.success(`Added ${sorts.length} sort${sorts.length !== 1 ? "s" : ""}`);
          }
          break;
        }
        case "remove_sorts": {
          const payload = removeSortsInputSchema.safeParse(result.output);
          if (!payload.success) return;
          setProgress(null);
          const { columnIds } = payload.data;
          if (columnIds.length > 0 && onSortsRemoved) {
            onSortsRemoved(columnIds);
            toast.success(
              `Removed sorting from ${columnIds.length} column${columnIds.length !== 1 ? "s" : ""}`,
            );
          }
          break;
        }
        case "clear_sorts": {
          setProgress(null);
          if (onSortsCleared) {
            onSortsCleared();
            toast.success("Cleared all sorting");
          }
          break;
        }
      }
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
    onEvent: applyToolResult,
    onError: (error) => {
      setProgress(null);
      if (isAuthError(error)) {
        removeApiKey();
        toast.error("Invalid API key. Please enter a valid Vercel Gateway API key.");
        setShowApiKeyModal(true);
      } else {
        toast.error(error.message || "Something went wrong");
      }
    },
  });
  const { status } = agent;

  const isLoading = status === "submitted" || status === "streaming";

  // The turn is over (success or failure): drop the shimmer and any cell
  // spinners the enrich flow left behind (e.g. the model never called
  // enrich_cells, or the turn errored mid-flight).
  useEffect(() => {
    if (status === "ready" || status === "error") {
      setProgress(null);
      setGeneratingCells(new Set());
    }
  }, [status, setGeneratingCells]);

  const needsKey = !apiKey && process.env.NODE_ENV !== "development";

  const handleTextareaFocus = () => {
    // Skip modal in local dev (env var handles auth server-side)
    if (needsKey) {
      setShowApiKeyModal(true);
    }
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = useCallback(
    (e: { preventDefault: () => void }) => {
      e.preventDefault();
      if (isLoading) return;
      if (!input.trim() && !hasSelection) return;
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
        setProgress(`Enriching ${cellKeys.size} cell${cellKeys.size !== 1 ? "s" : ""}...`);
      } else {
        setProgress("Processing...");
      }

      // Single-turn semantics (the old `setMessages([])`): every submit
      // starts a fresh session; state arrives via clientContext anyway.
      agent.reset();
      agent
        .send({
          message: input.trim() || "Enrich selected cells",
          clientContext: buildGridContext({
            columns: getExistingColumns?.() ?? [],
            filters: getExistingFilters?.() ?? [],
            sorts: getExistingSorts?.() ?? [],
            selection,
          }),
        })
        .catch(() => undefined); // failures surface via status/error/onError
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
              ref={textareaRef}
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
