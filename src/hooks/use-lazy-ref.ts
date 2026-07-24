import * as React from "react";

function useLazyRef<T>(fn: () => T): React.RefObject<T> {
  const ref = React.useRef<T | null>(null);
  if (ref.current === null) {
    ref.current = fn();
  }
  // `current` is filled in above on the first render and never reset, so the ref
  // is non-null for every read — but it is declared nullable to allow that first
  // assignment, and TS cannot carry the invariant across the boundary.
  // oxlint-disable-next-line typescript/consistent-type-assertions -- see comment above
  return ref as React.RefObject<T>;
}

export { useLazyRef };
