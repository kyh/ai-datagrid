import { KeyIcon, SparklesIcon } from "lucide-react";
import { Shimmer } from "../ui/shimmer";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "../ui/input-group";
import { toast } from "sonner";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { ApiKeyDialog, GATEWAY_API_KEY_STORAGE_KEY } from "./api-key-dialog";
import { useChat } from "@ai-sdk/react";
import type { ColumnUpdate } from "@/ai/messages/data-parts";
import {
  columnDefinitionSchema,
  filterSchema,
  sortSchema,
} from "@/ai/messages/data-parts";
import type {
  ExistingColumn,
  ExistingFilter,
  ExistingSort,
} from "@/ai/agents/table-agent";
import type { FilterValue, CellUpdate } from "@/lib/data-grid-types";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import type { SelectionContext } from "@/lib/selection-context";
import { getFilterFn } from "@/lib/data-grid-filters";
import { updateCellSchema } from "@/lib/data-grid-schema";
import { GenerateModeChatUIMessage } from "@/ai/messages/types";
import { useDataGridStore } from "@/stores/data-grid-store";

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
  const filterFn = getFilterFn();
  // AI Prompt state
  const [input, setInput] = useState(initialInput);
  const [progress, setProgress] = useState<{
    message: string;
    total?: number;
    completed?: number;
  } | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKey, , removeApiKey] = useLocalStorage<string>(
    GATEWAY_API_KEY_STORAGE_KEY,
    "",
  );

  const { sendMessage, status, setMessages } =
    useChat<GenerateModeChatUIMessage>({
      id: apiKey,
      onError: (error) => {
        setProgress(null);
        const errorMessage = error.message?.toLowerCase() || "";
        const isAuthError =
          errorMessage.includes("unauthorized") ||
          errorMessage.includes("authentication") ||
          errorMessage.includes("invalid api key") ||
          errorMessage.includes("401") ||
          errorMessage.includes("403");

        if (isAuthError) {
          removeApiKey();
          toast.error(
            "Invalid API key. Please enter a valid Vercel Gateway API key.",
          );
          setShowApiKeyModal(true);
        } else {
          toast.error(error.message || "Failed to generate block");
        }
      },
      onData: (dataPart) => {
        console.log(
          "[Chat] onData received:",
          JSON.stringify(dataPart, null, 2),
        );
        try {
          if (!dataPart.data) {
            console.log("[Chat] No data in dataPart");
            return;
          }

          // Handle generate-columns data part
          if (dataPart.type === "data-generate-columns") {
            setProgress(null);
            if (dataPart.data.columns && onColumnsGenerated) {
              // Convert column definitions to ColumnDef format
              type ColumnDefinition = z.infer<typeof columnDefinitionSchema>;
              const columns: ColumnDef<unknown>[] = dataPart.data.columns.map(
                (col: ColumnDefinition): ColumnDef<unknown> => {
                  const baseMeta = {
                    label: col.label,
                  };

                  // Build cell config based on variant
                  let cellConfig:
                    | { variant: "short-text" }
                    | { variant: "long-text" }
                    | {
                        variant: "number";
                        min?: number;
                        max?: number;
                        step?: number;
                      }
                    | {
                        variant: "select";
                        options: Array<{ label: string; value: string }>;
                      }
                    | {
                        variant: "multi-select";
                        options: Array<{ label: string; value: string }>;
                      }
                    | { variant: "checkbox" }
                    | { variant: "date" }
                    | { variant: "url" }
                    | { variant: "file" };

                  switch (col.variant) {
                    case "number":
                      cellConfig = {
                        variant: "number",
                        ...(col.min !== undefined && { min: col.min }),
                        ...(col.max !== undefined && { max: col.max }),
                        ...(col.step !== undefined && { step: col.step }),
                      };
                      break;
                    case "select":
                    case "multi-select":
                      cellConfig = {
                        variant: col.variant,
                        options: col.options || [],
                      };
                      break;
                    case "short-text":
                    case "long-text":
                    case "checkbox":
                    case "date":
                    case "url":
                    case "file":
                      cellConfig = { variant: col.variant };
                      break;
                  }

                  return {
                    id: col.id,
                    accessorKey: col.id,
                    header: col.label,
                    minSize: 180,
                    filterFn,
                    meta: {
                      ...baseMeta,
                      cell: cellConfig,
                      ...(col.prompt && { prompt: col.prompt }),
                    },
                  };
                },
              );
              onColumnsGenerated(columns);
              toast.success(
                `Generated ${columns.length} column${
                  columns.length !== 1 ? "s" : ""
                }`,
              );
            }
          }

          // Handle update-columns data part
          if (dataPart.type === "data-update-columns") {
            setProgress(null);
            const { updates } = dataPart.data;
            if (updates && updates.length > 0 && onColumnsUpdated) {
              onColumnsUpdated(updates);
              toast.success(
                `Updated ${updates.length} column${updates.length !== 1 ? "s" : ""}`,
              );
            }
          }

          // Handle delete-columns data part
          if (dataPart.type === "data-delete-columns") {
            setProgress(null);
            const { columnIds } = dataPart.data;
            if (columnIds && columnIds.length > 0 && onColumnsDeleted) {
              onColumnsDeleted(columnIds);
              toast.success(
                `Deleted ${columnIds.length} column${columnIds.length !== 1 ? "s" : ""}`,
              );
            }
          }

          // Handle enrich-data data part
          if (dataPart.type === "data-enrich-data") {
            const { updates: enrichUpdates } = dataPart.data;
            if (enrichUpdates && enrichUpdates.length > 0 && onDataEnriched) {
              const updates: CellUpdate[] = enrichUpdates.map((update) => ({
                rowIndex: update.rowIndex,
                columnId: update.columnId,
                value: update.value,
              }));
              console.log("[Chat] Calling onDataEnriched with:", updates);
              onDataEnriched(updates);

              // Remove completed cells from generating set
              for (const update of updates) {
                const cellKey = `${update.rowIndex}:${update.columnId}`;
                removeGeneratingCell(cellKey);
              }

              // Update progress
              setProgress((prev) => {
                if (!prev || prev.total === undefined || prev.completed === undefined) return null;
                const newCompleted = prev.completed + updates.length;
                // Clear progress when done
                if (newCompleted >= prev.total) {
                  return null;
                }
                return { ...prev, completed: newCompleted };
              });

              toast.success(
                `Updated ${updates.length} cell${updates.length !== 1 ? "s" : ""}`,
              );
            }
          }

          // Handle add-filters data part
          if (dataPart.type === "data-add-filters") {
            setProgress(null);
            const { filters: rawFilters } = dataPart.data;
            if (rawFilters && rawFilters.length > 0 && onFiltersAdded) {
              // Parse through schema to apply transforms (cleans malformed values)
              const parsed = z.array(filterSchema).safeParse(rawFilters);
              const filters = parsed.success ? parsed.data : rawFilters;
              const filterValues = filters.map((f: z.infer<typeof filterSchema>) => ({
                columnId: f.columnId,
                value: {
                  operator: f.operator,
                  value: f.value,
                  endValue: f.endValue,
                } as FilterValue,
              }));
              onFiltersAdded(filterValues);
              toast.success(
                `Added ${filters.length} filter${filters.length !== 1 ? "s" : ""}`,
              );
            }
          }

          // Handle remove-filters data part
          if (dataPart.type === "data-remove-filters") {
            setProgress(null);
            const { columnIds } = dataPart.data;
            if (columnIds && columnIds.length > 0 && onFiltersRemoved) {
              onFiltersRemoved(columnIds);
              toast.success(
                `Removed ${columnIds.length} filter${columnIds.length !== 1 ? "s" : ""}`,
              );
            }
          }

          // Handle clear-filters data part
          if (dataPart.type === "data-clear-filters") {
            setProgress(null);
            if (onFiltersCleared) {
              onFiltersCleared();
              toast.success("Cleared all filters");
            }
          }

          // Handle add-sorts data part
          if (dataPart.type === "data-add-sorts") {
            setProgress(null);
            const { sorts } = dataPart.data;
            if (sorts && sorts.length > 0 && onSortsAdded) {
              const sortValues = sorts.map((s: z.infer<typeof sortSchema>) => ({
                columnId: s.columnId,
                desc: s.direction === "desc",
              }));
              onSortsAdded(sortValues);
              toast.success(
                `Added ${sorts.length} sort${sorts.length !== 1 ? "s" : ""}`,
              );
            }
          }

          // Handle remove-sorts data part
          if (dataPart.type === "data-remove-sorts") {
            setProgress(null);
            const { columnIds } = dataPart.data;
            if (columnIds && columnIds.length > 0 && onSortsRemoved) {
              onSortsRemoved(columnIds);
              toast.success(
                `Removed sorting from ${columnIds.length} column${columnIds.length !== 1 ? "s" : ""}`,
              );
            }
          }

          // Handle clear-sorts data part
          if (dataPart.type === "data-clear-sorts") {
            setProgress(null);
            if (onSortsCleared) {
              onSortsCleared();
              toast.success("Cleared all sorting");
            }
          }
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Failed to process data part",
          );
        }
      },
    });

  const isLoading = status === "submitted" || status === "streaming";

  const handleTextareaFocus = () => {
    // Skip modal in local dev (env var handles auth server-side)
    if (!apiKey && process.env.NODE_ENV !== "development") {
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
    async (e: { preventDefault: () => void }) => {
      e.preventDefault();
      if (isLoading) return;
      if (!input.trim() && !hasSelection) return;

      const selectionContext = getSelectionContext?.() ?? null;

      // Set generating cells before sending
      if (selectionContext) {
        const cellKeys = new Set(
          selectionContext.selectedCells.map(
            (c) => `${c.rowIndex}:${c.columnId}`,
          ),
        );
        console.log("[Chat] Setting generating cells:", [...cellKeys]);
        setGeneratingCells(cellKeys);
        setProgress({ message: "Enriching...", total: cellKeys.size, completed: 0 });
      } else {
        setProgress({ message: "Processing..." });
      }

      const buildRequestBody = () => {
        const existingColumns = getExistingColumns?.();
        const existingFilters = getExistingFilters?.();
        const existingSorts = getExistingSorts?.();
        return {
          ...(apiKey ? { gatewayApiKey: apiKey } : {}),
          ...(selectionContext ? { selectionContext } : {}),
          ...(existingColumns && existingColumns.length > 0
            ? { existingColumns }
            : {}),
          ...(existingFilters && existingFilters.length > 0
            ? { existingFilters }
            : {}),
          ...(existingSorts && existingSorts.length > 0
            ? { existingSorts }
            : {}),
        };
      };

      // Clear previous messages to start fresh
      setMessages([]);

      try {
        sendMessage(
          { text: input || "Enrich selected cells" },
          { body: buildRequestBody() },
        );
        setInput("");
      } catch {
        sendMessage(
          { text: input || "Enrich selected cells" },
          { body: buildRequestBody() },
        );
        setInput("");
      }
    },
    [
      input,
      isLoading,
      hasSelection,
      apiKey,
      sendMessage,
      setInput,
      getSelectionContext,
      getExistingColumns,
      getExistingFilters,
      getExistingSorts,
      setGeneratingCells,
      setMessages,
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
        className="fixed bottom-3 left-1/2 z-50 -translate-x-1/2 w-full max-w-lg"
        data-grid-chat
      >
        {progress && (
          <div className="mb-2 px-4">
            <Shimmer className="text-xs">
              {progress.total !== undefined
                ? `${progress.completed}/${progress.total} cells`
                : progress.message}
            </Shimmer>
            {progress.total !== undefined && (
              <div className="h-1 bg-muted rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${((progress.completed ?? 0) / progress.total) * 100}%`,
                  }}
                />
              </div>
            )}
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
