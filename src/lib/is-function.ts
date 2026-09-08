export const isFunction = <T>(value: T): value is Extract<T, CallableFunction> =>
  typeof value === "function";
