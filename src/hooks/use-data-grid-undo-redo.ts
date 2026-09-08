import * as React from "react";
import { toast } from "sonner";

import { useAsRef } from "@/hooks/use-as-ref";
import { useLazyRef } from "@/hooks/use-lazy-ref";
import { getIsInPopover } from "@/lib/data-grid";

const DEFAULT_MAX_HISTORY = 100;
const BATCH_TIMEOUT = 300;

interface HistoryEntry<TData> {
  variant: "cells_update" | "rows_add" | "rows_delete";
  count: number;
  timestamp: number;
  undo: (currentData: TData[]) => TData[];
  redo: (currentData: TData[]) => TData[];
}

interface UndoRedoCellUpdate {
  rowId: string;
  columnId: string;
  previousValue: unknown;
  newValue: unknown;
}

interface StoreState<TData> {
  undoStack: HistoryEntry<TData>[];
  redoStack: HistoryEntry<TData>[];
  hasPendingChanges: boolean;
}

interface Store<TData> {
  subscribe: (listener: () => void) => () => void;
  getState: () => StoreState<TData>;
  push: (entry: HistoryEntry<TData>) => void;
  undo: () => HistoryEntry<TData> | null;
  redo: () => HistoryEntry<TData> | null;
  clear: () => void;
  setPendingChanges: (value: boolean) => void;
  notify: () => void;
}

const useStore = <T>(store: Store<T>, selector: (state: StoreState<T>) => boolean): boolean => {
  const getSnapshot = React.useCallback(() => selector(store.getState()), [store, selector]);

  return React.useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
};

const buildIndexById = <TData>(
  data: TData[],
  getRowId: (row: TData) => string,
): Map<string, number> => {
  const map = new Map<string, number>();
  for (let i = 0; i < data.length; i += 1) {
    const row = data[i];
    if (row) {
      map.set(getRowId(row), i);
    }
  }
  return map;
};

const getPendingKey = (rowId: string, columnId: string): string => `${rowId}\0${columnId}`;

interface UseDataGridUndoRedoProps<TData> {
  data: TData[];
  onDataChange: (data: TData[]) => void;
  getRowId: (row: TData) => string;
  maxHistory?: number;
  enabled?: boolean;
}

interface UseDataGridUndoRedoReturn<TData> {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  trackCellsUpdate: (updates: UndoRedoCellUpdate[]) => void;
  trackRowsAdd: (rows: TData[]) => void;
  trackRowsDelete: (rows: TData[]) => void;
}

const useDataGridUndoRedo = <TData>({
  data,
  onDataChange,
  getRowId,
  maxHistory = DEFAULT_MAX_HISTORY,
  enabled = true,
}: UseDataGridUndoRedoProps<TData>): UseDataGridUndoRedoReturn<TData> => {
  const propsRef = useAsRef({
    data,
    enabled,
    getRowId,
    maxHistory,
    onDataChange,
  });

  const listenersRef = useLazyRef(() => new Set<() => void>());

  const stateRef = useLazyRef<StoreState<TData>>(() => ({
    hasPendingChanges: false,
    redoStack: [],
    undoStack: [],
  }));

  // Batching state for cell updates
  const pendingUpdatesRef = useLazyRef(() => new Map<string, UndoRedoCellUpdate>());
  const batchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const store = React.useMemo<Store<TData>>(() => {
    const notify = () => {
      for (const listener of listenersRef.current) {
        listener();
      }
    };

    return {
      clear: () => {
        stateRef.current = {
          hasPendingChanges: false,
          redoStack: [],
          undoStack: [],
        };
        notify();
      },
      getState: () => stateRef.current,
      notify,
      push: (entry) => {
        const { maxHistory: historyLimit } = propsRef.current;
        const state = stateRef.current;

        const newUndoStack = [...state.undoStack, entry];
        if (newUndoStack.length > historyLimit) {
          newUndoStack.shift();
        }

        stateRef.current = {
          hasPendingChanges: false,
          redoStack: [],
          undoStack: newUndoStack,
        };
        notify();
      },
      redo: () => {
        const state = stateRef.current;
        const entry = state.redoStack.at(-1);
        if (!entry) {
          return null;
        }

        stateRef.current = {
          hasPendingChanges: state.hasPendingChanges,
          redoStack: state.redoStack.slice(0, -1),
          undoStack: [...state.undoStack, entry],
        };
        notify();
        return entry;
      },
      setPendingChanges: (value: boolean) => {
        if (stateRef.current.hasPendingChanges !== value) {
          stateRef.current = {
            ...stateRef.current,
            hasPendingChanges: value,
          };
          notify();
        }
      },
      subscribe: (listener) => {
        listenersRef.current.add(listener);
        return () => listenersRef.current.delete(listener);
      },
      undo: () => {
        const state = stateRef.current;
        const entry = state.undoStack.at(-1);
        if (!entry) {
          return null;
        }

        stateRef.current = {
          hasPendingChanges: state.hasPendingChanges,
          redoStack: [...state.redoStack, entry],
          undoStack: state.undoStack.slice(0, -1),
        };
        notify();
        return entry;
      },
    };
  }, [listenersRef, stateRef, propsRef]);

  const canUndo = useStore(store, (state) => state.undoStack.length > 0 || state.hasPendingChanges);
  const canRedo = useStore(store, (state) => state.redoStack.length > 0);

  const flushPendingUpdates = React.useCallback(() => {
    const pending = pendingUpdatesRef.current;
    if (pending.size === 0) {
      return;
    }

    const updates = [...pending.values()];
    pending.clear();

    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }

    const { getRowId: resolveRowId } = propsRef.current;

    const entry: HistoryEntry<TData> = {
      count: updates.length,
      redo: (currentData) => {
        const indexById = buildIndexById(currentData, resolveRowId);
        const newData = [...currentData];
        for (const update of updates) {
          const idx = indexById.get(update.rowId);
          if (idx !== undefined) {
            const row = newData[idx];
            if (row) {
              newData[idx] = {
                ...row,
                [update.columnId]: update.newValue,
              };
            }
          }
        }
        return newData;
      },
      timestamp: Date.now(),
      undo: (currentData) => {
        const indexById = buildIndexById(currentData, resolveRowId);
        const newData = [...currentData];
        for (const update of updates) {
          const idx = indexById.get(update.rowId);
          if (idx !== undefined) {
            const row = newData[idx];
            if (row) {
              newData[idx] = {
                ...row,
                [update.columnId]: update.previousValue,
              };
            }
          }
        }
        return newData;
      },
      variant: "cells_update",
    };

    store.push(entry);
  }, [pendingUpdatesRef, propsRef, store]);

  const onUndo = React.useCallback(() => {
    if (!propsRef.current.enabled) {
      return;
    }

    // Flush pending changes first
    if (pendingUpdatesRef.current.size > 0) {
      flushPendingUpdates();
    }

    const entry = store.undo();
    if (!entry) {
      return;
    }

    const newData = entry.undo(propsRef.current.data);
    propsRef.current.onDataChange(newData);

    const label =
      entry.variant === "cells_update"
        ? `cell${entry.count === 1 ? "" : "s"}`
        : `row${entry.count === 1 ? "" : "s"}`;
    toast.success(`Undo: ${entry.count} ${label}`);
  }, [store, propsRef, pendingUpdatesRef, flushPendingUpdates]);

  const onRedo = React.useCallback(() => {
    if (!propsRef.current.enabled) {
      return;
    }

    const entry = store.redo();
    if (!entry) {
      return;
    }

    const newData = entry.redo(propsRef.current.data);
    propsRef.current.onDataChange(newData);

    const label =
      entry.variant === "cells_update"
        ? `cell${entry.count === 1 ? "" : "s"}`
        : `row${entry.count === 1 ? "" : "s"}`;
    toast.success(`Redo: ${entry.count} ${label}`);
  }, [store, propsRef]);

  const onClear = React.useCallback(() => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }
    pendingUpdatesRef.current.clear();
    store.clear();
  }, [store, pendingUpdatesRef]);

  const trackCellsUpdate = React.useCallback(
    (updates: UndoRedoCellUpdate[]) => {
      if (!propsRef.current.enabled || updates.length === 0) {
        return;
      }

      const pending = pendingUpdatesRef.current;

      for (const update of updates) {
        const key = getPendingKey(update.rowId, update.columnId);
        const existing = pending.get(key);

        if (existing) {
          // Keep original previousValue, update newValue
          pending.set(key, {
            ...update,
            previousValue: existing.previousValue,
          });
        } else {
          pending.set(key, update);
        }
      }

      store.setPendingChanges(true);

      // Reset batch timeout
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }

      batchTimeoutRef.current = setTimeout(() => {
        batchTimeoutRef.current = null;
        flushPendingUpdates();
      }, BATCH_TIMEOUT);
    },
    [store, propsRef, pendingUpdatesRef, flushPendingUpdates],
  );

  const trackRowsAdd = React.useCallback(
    (rows: TData[]) => {
      if (!propsRef.current.enabled || rows.length === 0) {
        return;
      }

      // Flush pending cell updates before row operations
      if (pendingUpdatesRef.current.size > 0) {
        flushPendingUpdates();
      }

      const { getRowId: resolveRowId } = propsRef.current;
      const rowIds = rows.map(resolveRowId);

      const entry: HistoryEntry<TData> = {
        count: rows.length,
        redo: (currentData) =>
          // Re-add rows at end (original positions may have shifted)
          [...currentData, ...rows],
        timestamp: Date.now(),
        undo: (currentData) => {
          const indexById = buildIndexById(currentData, resolveRowId);
          const indicesToRemove: number[] = [];
          for (const id of rowIds) {
            const idx = indexById.get(id);
            if (idx !== undefined) {
              indicesToRemove.push(idx);
            }
          }
          // Sort descending to remove from end first
          indicesToRemove.sort((a, b) => b - a);
          const newData = [...currentData];
          for (const idx of indicesToRemove) {
            newData.splice(idx, 1);
          }
          return newData;
        },
        variant: "rows_add",
      };

      store.push(entry);
    },
    [store, propsRef, pendingUpdatesRef, flushPendingUpdates],
  );

  const trackRowsDelete = React.useCallback(
    (rows: TData[]) => {
      if (!propsRef.current.enabled || rows.length === 0) {
        return;
      }

      // Flush pending cell updates before row operations
      if (pendingUpdatesRef.current.size > 0) {
        flushPendingUpdates();
      }

      const { getRowId: resolveRowId } = propsRef.current;
      const rowIds = rows.map(resolveRowId);

      const entry: HistoryEntry<TData> = {
        count: rows.length,
        redo: (currentData) => {
          const indexById = buildIndexById(currentData, resolveRowId);
          const indicesToRemove: number[] = [];
          for (const id of rowIds) {
            const idx = indexById.get(id);
            if (idx !== undefined) {
              indicesToRemove.push(idx);
            }
          }
          // Sort descending to remove from end first
          indicesToRemove.sort((a, b) => b - a);
          const newData = [...currentData];
          for (const idx of indicesToRemove) {
            newData.splice(idx, 1);
          }
          return newData;
        },
        timestamp: Date.now(),
        undo: (currentData) =>
          // Re-add deleted rows at end
          [...currentData, ...rows],
        variant: "rows_delete",
      };

      store.push(entry);
    },
    [store, propsRef, pendingUpdatesRef, flushPendingUpdates],
  );

  // Cleanup batch timeout on unmount
  React.useEffect(
    () => () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    },
    [],
  );

  // Keyboard event listener for undo/redo
  React.useEffect(() => {
    if (!enabled) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const isCtrlOrCmd = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (!isCtrlOrCmd || (key !== "z" && key !== "y")) {
        return;
      }

      const { activeElement } = document;
      if (activeElement) {
        const isInput = activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA";
        const isContentEditable = activeElement.getAttribute("contenteditable") === "true";
        const isInPopover = getIsInPopover(activeElement);

        if (isInput || isContentEditable || isInPopover) {
          return;
        }
      }

      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        onUndo();
        return;
      }

      if ((key === "z" && event.shiftKey) || key === "y") {
        event.preventDefault();
        onRedo();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [enabled, onUndo, onRedo]);

  return {
    canRedo,
    canUndo,
    onClear,
    onRedo,
    onUndo,
    trackCellsUpdate,
    trackRowsAdd,
    trackRowsDelete,
  };
};

export { useDataGridUndoRedo, type UndoRedoCellUpdate };
