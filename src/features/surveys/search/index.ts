import type { ChatInputCommandInteraction } from "discord.js";
import { GuildMember } from "discord.js";
import assert from "node:assert";

import * as searchUi from "./ui";
import * as database from "../database";
import * as surveysUi from "../ui";

export enum Option {
  Title = "title",
}

export default async (interaction: ChatInputCommandInteraction) => {
  const { guildId, member, options } = interaction;
  assert(guildId !== null);
  assert(member instanceof GuildMember);

  const title = options.getString(Option.Title, true);
  const survey = await database.getSurvey({ guildId, title });
  if (survey === undefined) return interaction.reply(searchUi.noSurvey(title));

  return interaction.reply({
    ...surveysUi.survey(survey, member),
    ephemeral: true,
  });
};
