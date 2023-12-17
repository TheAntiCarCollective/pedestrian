import type { Index } from "lunr";

import lunr from "lunr";
import assert from "node:assert";

import type { Car, CompareCars } from "./types";

import Environment from "../../shared/environment";
import loggerFactory from "../../shared/logger";
import { isNonNullable } from "../../shared/nullable";
import { usePage } from "../../shared/puppeteer";
import RedisKey, * as redis from "../../shared/redis";
import { Perspective } from "./constants";

const logger = loggerFactory(module);

const CarsizedBaseUrl = "https://www.carsized.com/en";

const cars: Record<string, Car> = {};
let carsIndex: Index | undefined;

export const toName = ({ body, make, model, production }: Car) =>
  `${make} ${model} ${body} ${production}`;

export const getCar = (id: string) => cars[id];

export const searchCars = (carName: string) => {
  if (carsIndex === undefined) return [];
  return carsIndex
    .search(carName)
    .map(({ ref }) => getCar(ref))
    .filter(isNonNullable);
};

export const compareCars = async ({
  firstCar,
  perspective,
  secondCar,
  units,
}: CompareCars) =>
  usePage(async (page) => {
    await page.setJavaScriptEnabled(false);
    await page.setViewport({ height: 720, width: 1280 });

    const compareSegment = `${firstCar.id}-vs-${secondCar.id}`;
    const perspectiveSegment =
      perspective === Perspective.Side ? "" : perspective;
    // prettier-ignore
    await page.goto(`${CarsizedBaseUrl}/cars/compare/${compareSegment}/${perspectiveSegment}?units=${units}`);
    await page.waitForNetworkIdle(); // Allow images to load before continuing

    const contentHandle = await page.$("div.flowcontent");
    assert(contentHandle !== null);

    const screenshot = await contentHandle.screenshot();
    assert(typeof screenshot === "object");
    return screenshot;
  });

// region initializeCars
const ExpireIn30Days = 2_592_000_000;

const getCars = async () => {
  try {
    const cars = await usePage(async (page) => {
      await page.setJavaScriptEnabled(false);
      await page.goto(`${CarsizedBaseUrl}/cars/`);
      return page.evaluate(() => {
        const cars = [];

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

          cars.push({
            body,
            id,
            make,
            model,
            production,
          });
        }

        return cars;
      });
    });

    logger.debug(cars, "GET_CARS_SUCCESS");
    return cars;
  } catch (error) {
    logger.error(error, "GET_CARS_ERROR");
    return [];
  }
};

const initializeCars = async () => {
  const carsArray = Environment.EnableCarsized
    ? await redis.computeIfAbsent(RedisKey.Cars, getCars, ExpireIn30Days)
    : [];

  carsIndex = lunr((builder) => {
    builder.ref("id");

    builder.field("body");
    builder.field("make");
    builder.field("model");
    builder.field("production");

    for (const car of carsArray) {
      cars[car.id] = car;
      builder.add(car);
    }
  });

  logger.info(`Indexed ${carsArray.length} cars from ${CarsizedBaseUrl}`);
};

void initializeCars();
// endregion
