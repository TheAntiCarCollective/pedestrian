import type Nullable from "./nullable";

import { isNullable } from "./nullable";

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

export const isUnique = <T>(value: T, index: number, array: T[]) =>
  array.indexOf(value) === index;
