import type { ChatInputCommandInteraction } from "discord.js";
import assert from "node:assert";

import * as database from "./database";
import * as ui from "./ui";

export default async (interaction: ChatInputCommandInteraction) => {
  const { guildId } = interaction;
  assert(guildId !== null);

  const surveyCreatorRoleId = await database.getSurveyCreatorRoleId(guildId);
  return interaction.reply(ui.setting(surveyCreatorRoleId));
};
