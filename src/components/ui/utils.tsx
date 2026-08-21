import * as React from "react";

import { useCallbackRef } from "@/hooks/use-callback-ref";

/**
 * @see https://github.com/radix-ui/primitives/blob/main/packages/react/compose-refs/src/composeRefs.tsx
 */
type PossibleRef<T> = React.Ref<T> | undefined;

/**
 * Set a given ref to a given value
 * This utility takes care of different types of refs: callback refs and RefObject(s)
 */
function setRef<T>(ref: PossibleRef<T>, value: T) {
  if (ref instanceof Function) {
    ref(value);
  } else if (ref !== null && ref !== undefined) {
    ref.current = value;
  }
}

/**
 * A utility to compose multiple refs together
 * Accepts callback refs and RefObject(s)
 */
export function composeRefs<T>(...refs: PossibleRef<T>[]) {
  return (node: T) => refs.forEach((ref) => setRef(ref, node));
}

/**
 * A custom hook that composes multiple refs
 * Accepts callback refs and RefObject(s)
 */
export function useComposedRefs<T>(...refs: PossibleRef<T>[]) {
  // `refs` is the dep array by design — the composed callback must change with it.
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- see comment above
  return React.useCallback(composeRefs(...refs), refs);
}

export function useDebounce<T>(value: T, delay?: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay ?? 500);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useDebouncedCallback<T extends (...args: never[]) => void>(
  callback: T,
  delay: number,
) {
  const handleCallback = useCallbackRef(callback);
  const debounceTimerRef = React.useRef(0);
  React.useEffect(() => () => window.clearTimeout(debounceTimerRef.current), []);

  const setValue = React.useCallback(
    (...args: Parameters<T>) => {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = window.setTimeout(() => handleCallback(...args), delay);
    },
    [handleCallback, delay],
  );

  return setValue;
}

// Media queries never match while prerendering, so the server snapshot is always `false`
function getMediaQueryServerSnapshot() {
  return false;
}

export function useMediaQuery(query = "(min-width: 640px)") {
  const subscribe = React.useCallback(
    (onStoreChange: () => void) => {
      const result = matchMedia(query);
      result.addEventListener("change", onStoreChange);
      return () => result.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  const getSnapshot = React.useCallback(() => matchMedia(query).matches, [query]);

  return React.useSyncExternalStore(subscribe, getSnapshot, getMediaQueryServerSnapshot);
}

/**
 * `Intl.DateTimeFormat` construction is the expensive part; `.format()` is cheap.
 * Callers live inside render (`data-grid-filter-menu.tsx`), so formatters are
 * built once per distinct option set and reused. The zone is deliberately LOCAL:
 * inputs are ISO instants derived from a local-midnight `Date`, so pinning UTC
 * here would display the wrong calendar day east of UTC. Grid cells go through
 * `formatDateForDisplay` (`src/lib/data-grid.ts`) instead, which is zone-pinned.
 */
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

export function formatDate(date: Date | string | number, opts: Intl.DateTimeFormatOptions = {}) {
  const resolved: Intl.DateTimeFormatOptions = {
    month: opts.month ?? "long",
    day: opts.day ?? "numeric",
    year: opts.year ?? "numeric",
    ...opts,
  };
  const key = JSON.stringify(resolved);
  let formatter = dateFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", resolved);
    dateFormatters.set(key, formatter);
  }
  return formatter.format(new Date(date));
}

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
}
