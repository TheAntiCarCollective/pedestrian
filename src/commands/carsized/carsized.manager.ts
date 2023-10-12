import type { Index } from "lunr";

import lunr from "lunr";
import assert from "node:assert";
import loggerFactory from "pino";

import type { Car, CompareCars } from "./types";

import Environment from "../../shared/environment";
import { isNonNullable } from "../../shared/nullable";
import { usePage } from "../../shared/puppeteer";
import { Prospective } from "./constants";

const logger = loggerFactory({
  name: __filename,
});

const CarsizedBaseUrl = "https://www.carsized.com/en";

const cars = new Map<string, Car>();
let carsIndex: Index | undefined;

export const toName = ({ body, make, model, production }: Car) =>
  `${make} ${model} ${body} ${production}`;

export const getCar = (id: string) => cars.get(id);

export const searchCars = (carName: string) => {
  if (carsIndex === undefined) return [];
  return carsIndex
    .search(carName)
    .map(({ ref }) => cars.get(ref))
    .filter(isNonNullable);
};

export const compareCars = async ({
  firstCar,
  prospective,
  secondCar,
  units,
}: CompareCars) =>
  usePage(async (page) => {
    await page.setJavaScriptEnabled(false);
    const compareSegment = `${firstCar.id}-vs-${secondCar.id}`;
    const prospectiveSegment =
      prospective === Prospective.Side ? "" : prospective;
    // prettier-ignore
    await page.goto(`${CarsizedBaseUrl}/cars/compare/${compareSegment}/${prospectiveSegment}?units=${units}`);

    const contentHandle = await page.$("div.flowcontent");
    assert(contentHandle !== null);

    await page.setViewport({ height: 720, width: 1280 });
    const screenshot = await contentHandle.screenshot();
    assert(typeof screenshot === "object");
    return screenshot;
  });

// region initializeCars
const initializeCars = async () => {
  const carsArray = await usePage(async (page) => {
    await page.setJavaScriptEnabled(false);
    await page.goto(`${CarsizedBaseUrl}/cars/`);
    return page.evaluate(() => {
      const carsArray = [];

      const containers = document.querySelectorAll("div.indexcontainer");
      for (let index = 0; index < containers.length; index++) {
        const container = containers.item(index);
        const a = container.querySelector("a");

        const href = a?.getAttribute("href");
        const segments = href?.split("/");
        const validSegments = segments?.filter((segment) => segment !== "");
        const id = validSegments?.at(-1);
        // Given https://www.carsized.com/en/cars/abarth-500-2008-3-door-hatchback/
        // id should equal "abarth-500-2008-3-door-hatchback"
        if (id === undefined) continue;

        // eslint-disable-next-line unicorn/consistent-function-scoping
        const getValue = (name: string) => {
          const span = a?.querySelector(`span.index${name}`);
          return span?.textContent ?? `(unknown ${name})`;
        };

        const body = getValue("body");
        const make = getValue("make");
        const model = getValue("model");
        const production = getValue("production");

        carsArray.push({
          body,
          id,
          make,
          model,
          production,
        });
      }

      return carsArray;
    });
  });

  for (const car of carsArray) cars.set(car.id, car);
};

const initializeCarsIndex = async () => {
  if (Environment.EnableCarsized === "true") {
    try {
      await initializeCars();
      logger.debug(cars, "INITIALIZE_CARS_SUCCESS");
    } catch (error) {
      logger.error(error, "INITIALIZE_CARS_ERROR");
    }
  }

  carsIndex = lunr((builder) => {
    builder.ref("id");

    builder.field("body");
    builder.field("make");
    builder.field("model");
    builder.field("production");

    for (const car of cars.values()) builder.add(car);
  });

  logger.info(`Indexed ${cars.size} cars from ${CarsizedBaseUrl}`);
};

void initializeCarsIndex();
// endregion
