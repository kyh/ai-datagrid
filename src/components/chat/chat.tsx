import { KeyIcon, SparklesIcon } from "lucide-react";
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
import type { DataPart } from "@/ai/messages/data-parts";
import type { ColumnDef } from "@tanstack/react-table";
import type { CellUpdate } from "@/lib/data-grid-types";
import type { SelectionContext } from "@/lib/selection-context";
import { getFilterFn } from "@/lib/data-grid-filters";
import type { z } from "zod";
import { columnDefinitionSchema } from "@/ai/messages/data-parts";
import { updateCellSchema } from "@/lib/data-grid-schema";
import { GenerateModeChatUIMessage } from "@/ai/messages/types";
import { useDataGridStore } from "@/stores/data-grid-store";

interface ChatProps {
  onColumnsGenerated?: (columns: ColumnDef<unknown>[]) => void;
  onDataEnriched?: (updates: CellUpdate[]) => void;
  getSelectionContext?: () => SelectionContext | null;
  hasSelection?: boolean;
  initialInput?: string;
}

export const Chat = ({
  onColumnsGenerated,
  onDataEnriched,
  getSelectionContext,
  hasSelection = false,
  initialInput = "",
}: ChatProps = {}) => {
  // Use Zustand store for generating cells state
  const { setGeneratingCells, removeGeneratingCell } = useDataGridStore();
  const filterFn = getFilterFn();
  // AI Prompt state
  const [input, setInput] = useState(initialInput);
  const [enrichProgress, setEnrichProgress] = useState<{
    total: number;
    completed: number;
  } | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKey, , removeApiKey] = useLocalStorage<string>(
    GATEWAY_API_KEY_STORAGE_KEY,
    ""
  );

  const { sendMessage, status, setMessages } = useChat<GenerateModeChatUIMessage>({
    id: apiKey,
    onError: (error) => {
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
          "Invalid API key. Please enter a valid Vercel Gateway API key."
        );
        setShowApiKeyModal(true);
      } else {
        toast.error(error.message || "Failed to generate block");
      }
    },
    onData: (dataPart) => {
      console.log("[Chat] onData received:", JSON.stringify(dataPart, null, 2));
      try {
        const data = dataPart.data as DataPart;
        if (!data) {
          console.log("[Chat] No data in dataPart");
          return;
        }

        // Handle generate-columns data part
        if (data && "generate-columns" in data && data["generate-columns"]) {
          const columnsData = data["generate-columns"];
          if (columnsData.columns && onColumnsGenerated) {
            // Convert column definitions to ColumnDef format
            type ColumnDefinition = z.infer<typeof columnDefinitionSchema>;
            const columns: ColumnDef<unknown>[] = columnsData.columns.map(
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
              }
            );
            onColumnsGenerated(columns);
            toast.success(
              `Generated ${columns.length} column${
                columns.length !== 1 ? "s" : ""
              }`
            );
          }
        }

        // Handle enrich-data data part
        if (data && "enrich-data" in data && data["enrich-data"]) {
          const enrichData = data["enrich-data"];
          if (enrichData.updates && enrichData.updates.length > 0 && onDataEnriched) {
            type LocalCellUpdate = z.infer<typeof updateCellSchema>;
            const updates: CellUpdate[] = enrichData.updates.map(
              (update: LocalCellUpdate) => ({
                rowIndex: update.rowIndex,
                columnId: update.columnId,
                value: update.value,
              })
            );
            console.log("[Chat] Calling onDataEnriched with:", updates);
            onDataEnriched(updates);

            // Remove completed cells from generating set
            for (const update of updates) {
              const cellKey = `${update.rowIndex}:${update.columnId}`;
              removeGeneratingCell(cellKey);
            }

            // Update progress
            setEnrichProgress((prev) => {
              if (!prev) return null;
              const newCompleted = prev.completed + updates.length;
              // Clear progress when done
              if (newCompleted >= prev.total) {
                return null;
              }
              return { ...prev, completed: newCompleted };
            });

            toast.success(
              `Updated ${updates.length} cell${updates.length !== 1 ? "s" : ""}`
            );
          }
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to process data part"
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
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isLoading) return;
      if (!input.trim() && !hasSelection) return;

      const selectionContext = getSelectionContext?.() ?? null;

      // Set generating cells before sending
      if (selectionContext) {
        const cellKeys = new Set(
          selectionContext.selectedCells.map(
            (c) => `${c.rowIndex}:${c.columnId}`
          )
        );
        console.log("[Chat] Setting generating cells:", [...cellKeys]);
        setGeneratingCells(cellKeys);
        setEnrichProgress({ total: cellKeys.size, completed: 0 });
      }

      const buildRequestBody = () => {
        return {
          ...(apiKey ? { gatewayApiKey: apiKey } : {}),
          ...(selectionContext ? { selectionContext } : {}),
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
    [input, isLoading, hasSelection, apiKey, sendMessage, setInput, getSelectionContext, setGeneratingCells, setMessages]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if ((input.trim() || hasSelection) && !isLoading) {
        handleSubmit(e as any);
      }
    }
  };

  return (
    <>
      <div className="fixed bottom-3 left-1/2 z-50 -translate-x-1/2 w-full max-w-lg" data-grid-chat>
        {enrichProgress && (
          <div className="mb-2 px-4">
            <div className="text-xs text-muted-foreground mb-1">
              {enrichProgress.completed}/{enrichProgress.total} cells
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${(enrichProgress.completed / enrichProgress.total) * 100}%`,
                }}
              />
            </div>
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
