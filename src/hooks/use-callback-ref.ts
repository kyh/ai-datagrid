import * as React from "react";

/**
 * @see https://github.com/radix-ui/primitives/blob/main/packages/react/use-callback-ref/src/useCallbackRef.tsx
 */

/**
 * A custom hook that converts a callback to a ref to avoid triggering re-renders when passed as a
 * prop or avoid re-executing effects when passed as a dependency
 */
const useCallbackRef = <T extends (...args: never[]) => void>(fn: T | undefined): T => {
  const fnRef = React.useRef(fn);

  React.useEffect(() => {
    fnRef.current = fn;
  });

  // https://github.com/facebook/react/issues/19240
  // SAFETY: the stable wrapper forwards to whatever `fnRef` currently
  // holds, so it behaves as a `T` but cannot be inferred as one — the parameter
  // tuple is only known through the type variable.
  return React.useMemo(() => ((...args) => fnRef.current?.(...args)) as T, []);
};

export { useCallbackRef };
