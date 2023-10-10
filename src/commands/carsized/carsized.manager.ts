import type { Index } from "lunr";

import lunr from "lunr";
import assert from "node:assert";
import loggerFactory from "pino";

import type { Car, CompareCars } from "./types";

import Environment from "../../environment";
import { isNonNullable } from "../../helpers";
import { usePage } from "../../services/puppeteer";
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
const initializeCars = () =>
  usePage(async (page) => {
    await page.setJavaScriptEnabled(false);
    await page.goto(`${CarsizedBaseUrl}/cars/`);

    const containerHandles = await page.$$("div.indexcontainer");
    const promises = containerHandles.map(async (containerHandle) => {
      const aHandle = await containerHandle.$("a");
      assert(aHandle !== null);

      const idPromise = aHandle
        .evaluate((a) => a.getAttribute("href"))
        .then((href) => {
          assert(href !== null);
          // Given https://www.carsized.com/en/cars/abarth-500-2008-3-door-hatchback/
          // id should equal "abarth-500-2008-3-door-hatchback"
          const id = href
            .split("/")
            .filter((segment) => segment !== "")
            .at(-1);

          assert(id !== undefined);
          return id;
        });

      const getValue = async (name: string) => {
        const spanHandle = await aHandle.$(`span.index${name}`);
        assert(spanHandle !== null);

        const value = await spanHandle.evaluate(
          ({ textContent }) => textContent,
        );

        assert(value !== null);
        return value;
      };

      const [body, id, make, model, production] = await Promise.all([
        getValue("body"),
        idPromise,
        getValue("make"),
        getValue("model"),
        getValue("production"),
      ]);

      cars.set(id, { body, id, make, model, production });
    });

    return Promise.all(promises);
  });

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
