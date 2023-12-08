// region Types
type Order = "asc" | "desc";

type Sort<T> = (a: T, b: T) => number;

type By = {
  <T, U>(property: (element: T) => U, order?: Order): Sort<T>;
  <T>(order?: Order): Sort<T>;
};
// endregion

export const by: By =
  <T, U>(property?: ((element: T) => U) | Order, order?: Order) =>
  (a: T, b: T) => {
    if (typeof property === "string") {
      order = property;
      property = undefined;
    }

    property ??= (element: unknown) => element as U;
    const aProperty = property(a);
    const bProperty = property(b);

    if (aProperty === bProperty) return 0;
    const result = aProperty > bProperty ? 1 : -1;

    order ??= "asc";
    return order === "asc" ? result : result * -1;
  };

export const unique = <T, U>(property?: (element: T) => U) => {
  const set = new Set<U>();
  return (value: T) => {
    property ??= (element: unknown) => element as U;
    const valueProperty = property(value);

    if (set.has(valueProperty)) return false;
    set.add(valueProperty);
    return true;
  };
};
