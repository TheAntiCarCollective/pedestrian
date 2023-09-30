// region Array
export const isUnique = <T>(value: T, index: number, array: T[]) =>
  array.indexOf(value) === index;
// endregion

// region Nullable
export type Nullable = null | undefined;

export const isNullable = <T>(value: Nullable | T): value is Nullable =>
  value === null || value === undefined;

export const isNonNullable = <T>(value: T): value is NonNullable<T> =>
  !isNullable(value);
// endregion

// region Caller
export class Caller {
  private readonly caller: Record<"name", string>;
  private readonly module: NodeModule;

  constructor(module: NodeModule, caller: Record<"name", string>) {
    this.module = module;
    this.caller = caller;
  }

  toString() {
    const { filename: url } = this.module;
    const { name: fragment } = this.caller;
    return `${url}#${fragment}`;
  }
}

export const caller = (module: NodeModule, caller: Record<"name", string>) =>
  new Caller(module, caller);
// endregion
