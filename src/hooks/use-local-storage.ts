"use client";

import * as React from "react";

/**
 * A hook to manage localStorage with React state synchronization.
 * Automatically syncs across components and handles SSR safely.
 *
 * @param key - The localStorage key
 * @param initialValue - The initial value if the key doesn't exist
 * @returns A tuple of [value, setValue, removeValue]
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // State to store our value
  const [storedValue, setStoredValue] = React.useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      if (!item) {
        return initialValue;
      }

      // Try to parse as JSON first, fallback to raw string if it fails
      try {
        return JSON.parse(item) as T;
      } catch {
        // If parsing fails, assume it's a plain string
        return item as T;
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage and syncs across tabs/windows
  const setValue = React.useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        // Allow value to be a function so we have the same API as useState
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;

        // Save state
        setStoredValue(valueToStore);

        // Save to local storage
        if (typeof window !== "undefined") {
          // If it's a string, store it directly; otherwise stringify
          if (typeof valueToStore === "string") {
            window.localStorage.setItem(key, valueToStore);
          } else {
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
          }

          // Dispatch custom event to sync within the same tab
          window.dispatchEvent(
            new CustomEvent("local-storage", {
              detail: { key, newValue: valueToStore },
            })
          );
        }
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Remove value from localStorage
  const removeValue = React.useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(key);
        // Dispatch custom event to sync within the same tab
        window.dispatchEvent(
          new CustomEvent("local-storage", {
            detail: { key, newValue: null },
          })
        );
      }
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  // Listen for changes to this key from other tabs/windows and same tab
  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleStorageChange = (
      e: StorageEvent | CustomEvent<{ key: string; newValue: T | null }>
    ) => {
      let eventKey: string | null;
      let newValue: string | T | null;

      if (e instanceof StorageEvent) {
        // StorageEvent from other tabs/windows
        eventKey = e.key;
        newValue = e.newValue;
      } else {
        // CustomEvent from same tab
        eventKey = e.detail?.key ?? null;
        newValue = e.detail?.newValue ?? null;
      }

      if (eventKey === key && newValue !== null) {
        try {
          // If it's from a custom event, it's already the parsed value
          if (e instanceof CustomEvent) {
            setStoredValue(newValue as T);
          } else {
            // StorageEvent: try to parse as JSON first, fallback to raw string
            const valueToParse = newValue as string;
            try {
              setStoredValue(JSON.parse(valueToParse) as T);
            } catch {
              // If parsing fails, assume it's a plain string
              setStoredValue(newValue as T);
            }
          }
        } catch (error) {
          console.error(
            `Error parsing localStorage value for key "${key}":`,
            error
          );
        }
      } else if (eventKey === key && newValue === null) {
        // Key was removed
        setStoredValue(initialValue);
      }
    };

    // Listen for storage events (other tabs/windows)
    window.addEventListener("storage", handleStorageChange as EventListener);
    // Listen for custom events (same tab)
    window.addEventListener(
      "local-storage",
      handleStorageChange as EventListener
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorageChange as EventListener
      );
      window.removeEventListener(
        "local-storage",
        handleStorageChange as EventListener
      );
    };
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
