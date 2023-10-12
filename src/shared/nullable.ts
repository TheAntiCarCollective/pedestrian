type Nullable = null | undefined;
export default Nullable;

export const isNullable = <T>(value: Nullable | T): value is Nullable =>
  value === null || value === undefined;

export const isNonNullable = <T>(value: T): value is NonNullable<T> =>
  !isNullable(value);
