import type { AutocompleteInteraction } from "discord.js";

import * as carsized from "./carsized.manager";

export default async (interaction: AutocompleteInteraction) => {
  const { options } = interaction;
  const carName = options.getFocused();

  const cars = carsized
    .searchCars(carName)
    .slice(0, 25)
    .map((car) => ({
      name: carsized.toName(car),
      value: car.id,
    }));

  await interaction.respond(cars);
};
