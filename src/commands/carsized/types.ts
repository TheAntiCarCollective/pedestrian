import type { Prospective, Units } from "./constants";

export type Car = {
  body: string;
  id: string;
  make: string;
  model: string;
  production: string;
};

export type CompareCars = {
  firstCar: Car;
  prospective: Prospective;
  secondCar: Car;
  units: Units;
};
