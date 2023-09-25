// region Array
export const isUnique = <T>(value: T, index: number, array: T[]) =>
  array.indexOf(value) === index;
// endregion

// region Nullable
// @ts-expect-error This function is designed for types T that include null or undefined
export const isNullable = <T>(value: T): value is null | undefined =>
  value === null || value === undefined;

export const isNonNullable = <T>(value: T): value is NonNullable<T> =>
  !isNullable(value);
// endregion
