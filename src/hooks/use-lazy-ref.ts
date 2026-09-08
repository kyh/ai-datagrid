import * as React from "react";

const useLazyRef = <T>(fn: () => T): React.RefObject<T> => {
  const ref = React.useRef<T | null>(null);
  if (ref.current === null) {
    ref.current = fn();
  }
  // SAFETY: `current` is filled in above on the first render and never reset,
  // so the ref is non-null for every read — it is declared nullable only to
  // allow that first assignment, and TS cannot carry the invariant across the
  // boundary.
  return ref as React.RefObject<T>;
};

export { useLazyRef };
