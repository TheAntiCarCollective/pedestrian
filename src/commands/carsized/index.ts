import type { CommandInteraction } from "discord.js";

import { SlashCommandBuilder } from "discord.js";
import assert from "node:assert";

import { registerCommand, toChoices } from "../../shared/discord";
import Environment from "../../shared/environment";
import onAutocomplete from "./autocomplete";
import * as carsized from "./carsized.manager";
import { Perspective, Units } from "./constants";
import session, * as withContext from "./context";
import UI from "./ui";

enum Option {
  FirstCar = "first-car",
  Perspective = "perspective",
  SecondCar = "second-car",
  Units = "units",
}

const json = new SlashCommandBuilder()
  .setName("carsized")
  .setDescription("Compare car sizes")
  .addStringOption((option) =>
    option
      .setAutocomplete(true)
      .setName(Option.FirstCar)
      .setDescription("First car to compare")
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setAutocomplete(true)
      .setName(Option.SecondCar)
      .setDescription("Second car to compare")
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName(Option.Perspective)
      .setDescription("Perspective of the comparison")
      .setChoices(...toChoices(Perspective)),
  )
  .addStringOption((option) =>
    option
      .setName(Option.Units)
      .setDescription("Units for comparison")
      .setChoices(...toChoices(Units)),
  )
  .toJSON();

const onCommand = async (interaction: CommandInteraction) => {
  assert(interaction.isChatInputCommand());
  const { options } = interaction;

  const firstCarId = options.getString(Option.FirstCar, true);
  const firstCar = carsized.getCar(firstCarId);
  if (firstCar === undefined)
    return interaction.reply(UI.noCarExists(firstCarId));

  const secondCarId = options.getString(Option.SecondCar, true);
  const secondCar = carsized.getCar(secondCarId);
  if (secondCar === undefined)
    return interaction.reply(UI.noCarExists(secondCarId));

  const perspectiveOption =
    options.getString(Option.Perspective) ?? Perspective.Side;
  const perspective = perspectiveOption as Perspective;

  const unitsOption = options.getString(Option.Units) ?? Units.Metric;
  const units = unitsOption as Units;

  const partialContext = {
    firstCar,
    perspective,
    secondCar,
    units,
  };

  const context = await session.create(partialContext, interaction);
  return withContext.compareCarsUi(context, interaction);
};

if (Environment.EnableCarsized)
  registerCommand(json, onCommand, onAutocomplete);
