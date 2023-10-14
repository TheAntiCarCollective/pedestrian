import type { Perspective, Units } from "./constants";

export type Car = {
  body: string;
  id: string;
  make: string;
  model: string;
  production: string;
};

export type CompareCars = {
  firstCar: Car;
  perspective: Perspective | undefined;
  /** @deprecated Use perspective **/
  prospective?: Perspective;
  secondCar: Car;
  units: Units;
};
