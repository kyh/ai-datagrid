import * as React from "react";

import { useCallbackRef } from "@/hooks/use-callback-ref";
import { isFunction } from "@/lib/is-function";

/**
 * @see https://github.com/radix-ui/primitives/blob/main/packages/react/compose-refs/src/composeRefs.tsx
 */
type PossibleRef<T> = React.Ref<T> | undefined;

/**
 * Set a given ref to a given value
 * This utility takes care of different types of refs: callback refs and RefObject(s)
 */
const setRef = <T,>(ref: PossibleRef<T>, value: T) => {
  if (isFunction(ref)) {
    ref(value);
  } else if (ref !== null && ref !== undefined) {
    ref.current = value;
  }
};

/**
 * A utility to compose multiple refs together
 * Accepts callback refs and RefObject(s)
 */
export const composeRefs =
  <T,>(...refs: PossibleRef<T>[]) =>
  (node: T) => {
    for (const ref of refs) {
      setRef(ref, node);
    }
  };

/**
 * A custom hook that composes two refs
 * Accepts callback refs and RefObject(s)
 */
export const useComposedRefs = <T,>(a: PossibleRef<T>, b: PossibleRef<T>) =>
  React.useCallback(
    (node: T) => {
      setRef(a, node);
      setRef(b, node);
    },
    [a, b],
  );

export const useDebounce = <T,>(value: T, delay?: number): T => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay ?? 500);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const useDebouncedCallback = <T extends (...args: never[]) => void>(
  callback: T,
  delay: number,
) => {
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
};

// Media queries never match while prerendering, so the server snapshot is always `false`
const getMediaQueryServerSnapshot = () => false;

export const useMediaQuery = (query = "(min-width: 640px)") => {
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
};

/**
 * `Intl.DateTimeFormat` construction is the expensive part; `.format()` is cheap.
 * Callers live inside render (`data-grid-filter-menu.tsx`), so formatters are
 * built once per distinct option set and reused. The zone is deliberately LOCAL:
 * inputs are ISO instants derived from a local-midnight `Date`, so pinning UTC
 * here would display the wrong calendar day east of UTC. Grid cells go through
 * `formatDateForDisplay` (`src/lib/data-grid.ts`) instead, which is zone-pinned.
 */
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

export const formatDate = (date: Date | string | number, opts: Intl.DateTimeFormatOptions = {}) => {
  const resolved: Intl.DateTimeFormatOptions = {
    day: opts.day ?? "numeric",
    month: opts.month ?? "long",
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
};

const MOBILE_BREAKPOINT = 768;

export const useIsMobile = () => useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
