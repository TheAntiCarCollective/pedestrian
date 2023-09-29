import type { ChatInputCommandInteraction } from "discord.js";

import assert from "node:assert";

import * as database from "../database";
import { surveyCreator } from "../functions";
import SurveysUI from "../ui";
import SearchUI from "./ui";

export enum Option {
  Title = "title",
}

export default async (interaction: ChatInputCommandInteraction) => {
  const { guildId, options } = interaction;
  assert(guildId !== null);

  const title = options.getString(Option.Title, true);
  const survey = await database.getSurvey({ guildId, title });
  if (survey === undefined) return interaction.reply(SearchUI.noSurvey(title));

  const creator = await surveyCreator(survey, interaction);
  return interaction.reply({
    ...SurveysUI.survey(survey, creator),
    ephemeral: true,
  });
};
