import * as React from "react";

/**
 * `React.memo` types its result as `MemoExoticComponent<T>`, which drops a
 * generic component's type parameters: a memoized `DataGridRow<TData>` stops
 * checking its props against `TData` and degrades to the constraint. Memoizing
 * changes nothing about the call signature at runtime, so re-stating the
 * original type is sound.
 *
 * This is the one place that widening happens — it replaces a
 * `as typeof <Component>Impl` cast at every memoized generic component.
 */
export function genericMemo<T extends (props: never) => React.ReactNode>(
  component: T,
  propsAreEqual?: (prev: Parameters<T>[0], next: Parameters<T>[0]) => boolean,
): T {
  // SAFETY: TS sees no overlap between the exotic component object and the
  // bare function type `T`, so the assertion must hop through `unknown`.
  // oxlint-disable-next-line typescript/consistent-type-assertions -- see doc comment above
  const memoized = React.memo(component, propsAreEqual) as unknown;
  // SAFETY: memoizing changes nothing about the call signature at runtime —
  // `React.memo` returns a component that renders `component` with the same
  // props — so re-stating `T` only restores the generic parameters that
  // `MemoExoticComponent` erased.
  // oxlint-disable-next-line typescript/consistent-type-assertions -- see doc comment above
  return memoized as T;
}
