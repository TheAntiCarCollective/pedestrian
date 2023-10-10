import type { CommandInteraction } from "discord.js";

import { SlashCommandBuilder } from "discord.js";
import assert from "node:assert";

import Environment from "../../environment";
import { registerCommand, toChoices } from "../../services/discord";
import onAutocomplete from "./autocomplete";
import * as carsized from "./carsized.manager";
import { Prospective, Units } from "./constants";
import session, * as withContext from "./context";
import UI from "./ui";

enum Option {
  FirstCar = "first-car",
  Prospective = "prospective",
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
      .setName(Option.Prospective)
      .setDescription("Prospective of the comparison")
      .setChoices(...toChoices(Prospective)),
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

  const prospectiveOption =
    options.getString(Option.Prospective) ?? Prospective.Side;
  const prospective = prospectiveOption as Prospective;

  const unitsOption = options.getString(Option.Units) ?? Units.Metric;
  const units = unitsOption as Units;

  const partialContext = {
    firstCar,
    prospective,
    secondCar,
    units,
  };

  const context = await session.create(partialContext, interaction);
  return withContext.compareCarsUi(context, interaction);
};

if (Environment.EnableCarsized === "true")
  registerCommand(json, onCommand, onAutocomplete);
