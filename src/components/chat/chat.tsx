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
import { dataPartSchemas } from "@/ai/messages/data-parts";
import { demoTransport } from "./demo-transport";
import type { ExistingColumn, ExistingFilter, ExistingSort } from "@/ai/agents/table-agent";
import type { FilterValue, CellUpdate } from "@/lib/data-grid-types";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import type { SelectionContext } from "@/lib/selection-context";
import { columnDefinitionToColumnDef } from "@/lib/column-mapping";
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
  // AI Prompt state
  const [input, setInput] = useState(initialInput);
  const [progress, setProgress] = useState<{
    message: string;
    total?: number;
    completed?: number;
  } | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKey, , removeApiKey] = useLocalStorage(GATEWAY_API_KEY_STORAGE_KEY, "");

  // Counts `count` cells toward the enrich progress bar, clearing it once done
  const advanceProgress = (count: number) => {
    setProgress((prev) => {
      if (!prev || prev.total === undefined || prev.completed === undefined) return null;
      const completed = prev.completed + count;
      return completed >= prev.total ? null : { ...prev, completed };
    });
  };

  const { sendMessage, status, setMessages } = useChat<GenerateModeChatUIMessage>({
    id: apiKey,
    transport: apiKey === "demo" ? demoTransport : undefined,
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
        toast.error("Invalid API key. Please enter a valid Vercel Gateway API key.");
        setShowApiKeyModal(true);
      } else {
        toast.error(error.message || "Failed to generate block");
      }
    },
    onData: (dataPart) => {
      try {
        if (!dataPart.data) {
          return;
        }

        // Handle generate-columns data part
        if (dataPart.type === "data-generate-columns") {
          setProgress(null);
          const { columns } = dataPartSchemas["generate-columns"].parse(dataPart.data);
          if (onColumnsGenerated) {
            onColumnsGenerated(columns.map(columnDefinitionToColumnDef));
            toast.success(`Generated ${columns.length} column${columns.length !== 1 ? "s" : ""}`);
          }
        }

        // Handle update-columns data part
        if (dataPart.type === "data-update-columns") {
          setProgress(null);
          const { updates } = dataPartSchemas["update-columns"].parse(dataPart.data);
          if (updates.length > 0 && onColumnsUpdated) {
            onColumnsUpdated(updates);
            toast.success(`Updated ${updates.length} column${updates.length !== 1 ? "s" : ""}`);
          }
        }

        // Handle delete-columns data part
        if (dataPart.type === "data-delete-columns") {
          setProgress(null);
          const { columnIds } = dataPartSchemas["delete-columns"].parse(dataPart.data);
          if (columnIds.length > 0 && onColumnsDeleted) {
            onColumnsDeleted(columnIds);
            toast.success(`Deleted ${columnIds.length} column${columnIds.length !== 1 ? "s" : ""}`);
          }
        }

        // Handle enrich-data data part
        if (dataPart.type === "data-enrich-data") {
          const { updates: enrichUpdates } = dataPartSchemas["enrich-data"].parse(dataPart.data);
          if (enrichUpdates.length > 0 && onDataEnriched) {
            const updates: CellUpdate[] = enrichUpdates.map((update) => ({
              rowIndex: update.rowIndex,
              columnId: update.columnId,
              value: update.value,
            }));
            onDataEnriched(updates);

            // Remove completed cells from generating set
            for (const update of updates) {
              removeGeneratingCell(`${update.rowIndex}:${update.columnId}`);
            }

            advanceProgress(updates.length);
            toast.success(`Updated ${updates.length} cell${updates.length !== 1 ? "s" : ""}`);
          }
        }

        // Handle enrich-errors data part (cells the data agent failed to fill)
        if (dataPart.type === "data-enrich-errors") {
          const { failures } = dataPartSchemas["enrich-errors"].parse(dataPart.data);
          if (failures.length > 0) {
            // Clear generating state for failed cells
            for (const failure of failures) {
              removeGeneratingCell(`${failure.rowIndex}:${failure.columnId}`);
            }

            // Count failures toward progress so the bar completes
            advanceProgress(failures.length);
            toast.error(
              `Failed to enrich ${failures.length} cell${failures.length !== 1 ? "s" : ""}`,
            );
          }
        }

        // Handle add-filters data part
        if (dataPart.type === "data-add-filters") {
          setProgress(null);
          // Parse through schema to apply transforms (cleans malformed values)
          const { filters } = dataPartSchemas["add-filters"].parse(dataPart.data);
          if (filters.length > 0 && onFiltersAdded) {
            const filterValues = filters.map((f) => ({
              columnId: f.columnId,
              value: {
                operator: f.operator,
                value: f.value,
                endValue: f.endValue,
              },
            }));
            onFiltersAdded(filterValues);
            toast.success(`Added ${filters.length} filter${filters.length !== 1 ? "s" : ""}`);
          }
        }

        // Handle remove-filters data part
        if (dataPart.type === "data-remove-filters") {
          setProgress(null);
          const { columnIds } = dataPartSchemas["remove-filters"].parse(dataPart.data);
          if (columnIds.length > 0 && onFiltersRemoved) {
            onFiltersRemoved(columnIds);
            toast.success(`Removed ${columnIds.length} filter${columnIds.length !== 1 ? "s" : ""}`);
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
          const { sorts } = dataPartSchemas["add-sorts"].parse(dataPart.data);
          if (sorts.length > 0 && onSortsAdded) {
            const sortValues = sorts.map((s) => ({
              columnId: s.columnId,
              desc: s.direction === "desc",
            }));
            onSortsAdded(sortValues);
            toast.success(`Added ${sorts.length} sort${sorts.length !== 1 ? "s" : ""}`);
          }
        }

        // Handle remove-sorts data part
        if (dataPart.type === "data-remove-sorts") {
          setProgress(null);
          const { columnIds } = dataPartSchemas["remove-sorts"].parse(dataPart.data);
          if (columnIds.length > 0 && onSortsRemoved) {
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
        // Zod parse failure means the AI response violated the data-part contract
        if (err instanceof z.ZodError) {
          toast.error("AI response violated the data contract — no changes applied");
          return;
        }
        toast.error(err instanceof Error ? err.message : "Failed to process data part");
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
          selectionContext.selectedCells.map((c) => `${c.rowIndex}:${c.columnId}`),
        );
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
          ...(existingColumns && existingColumns.length > 0 ? { existingColumns } : {}),
          ...(existingFilters && existingFilters.length > 0 ? { existingFilters } : {}),
          ...(existingSorts && existingSorts.length > 0 ? { existingSorts } : {}),
        };
      };

      // Clear previous messages to start fresh
      setMessages([]);

      try {
        sendMessage({ text: input || "Enrich selected cells" }, { body: buildRequestBody() });
        setInput("");
      } catch {
        sendMessage({ text: input || "Enrich selected cells" }, { body: buildRequestBody() });
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
        className="fixed bottom-3 left-1/2 z-50 -translate-x-1/2 w-full max-w-lg px-3"
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
