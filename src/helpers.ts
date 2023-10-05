// region Array
export const isUnique = <T>(value: T, index: number, array: T[]) =>
  array.indexOf(value) === index;

export const byDate =
  <T, U extends Date | Nullable | number | string>(
    property: (element: T) => U,
    order: "asc" | "desc" = "asc",
  ) =>
  (a: T, b: T) => {
    const aValue = property(a);
    if (isNullable(aValue)) return 0;
    const aDate = new Date(aValue);
    const aTime = aDate.getTime();

    const bValue = property(b);
    if (isNullable(bValue)) return 0;
    const bDate = new Date(bValue);
    const bTime = bDate.getTime();

    switch (order) {
      case "asc": {
        return aTime - bTime;
      }
      case "desc": {
        return bTime - aTime;
      }
    }
  };
// endregion

// region Nullable
export type Nullable = null | undefined;

export const isNullable = <T>(value: Nullable | T): value is Nullable =>
  value === null || value === undefined;

export const isNonNullable = <T>(value: T): value is NonNullable<T> =>
  !isNullable(value);
// endregion

// region Caller
// Function type is safe since only name is accessed
/* eslint-disable @typescript-eslint/ban-types */
export class Caller {
  private readonly caller: Function;
  private readonly module: NodeModule;

  constructor(module: NodeModule, caller: Function) {
    this.module = module;
    this.caller = caller;
  }

  toString() {
    const { filename: url } = this.module;
    const { name: fragment } = this.caller;
    return `${url}#${fragment}`;
  }
}

export const caller = (module: NodeModule, caller: Function) =>
  new Caller(module, caller);
/* eslint-enable @typescript-eslint/ban-types */
// endregion
