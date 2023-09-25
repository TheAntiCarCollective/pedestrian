import type { ChatInputCommandInteraction } from "discord.js";
import assert from "node:assert";

import * as searchUi from "./ui";
import * as database from "../database";
import * as surveysUi from "../ui";
import { surveyCreator } from "../functions";

export enum Option {
  Title = "title",
}

export default async (interaction: ChatInputCommandInteraction) => {
  const { guildId, options } = interaction;
  assert(guildId !== null);

  const title = options.getString(Option.Title, true);
  const survey = await database.getSurvey({ guildId, title });
  if (survey === undefined) return interaction.reply(searchUi.noSurvey(title));

  const creator = await surveyCreator(survey, interaction);
  return interaction.reply({
    ...surveysUi.survey(survey, creator),
    ephemeral: true,
  });
};
