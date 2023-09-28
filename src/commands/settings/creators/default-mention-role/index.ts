import type { ChatInputCommandInteraction } from "discord.js";
import assert from "node:assert";

import * as database from "./database";
import UI from "./ui";

export default async (interaction: ChatInputCommandInteraction) => {
  const { guildId } = interaction;
  assert(guildId !== null);

  const defaultMentionRoleId = await database.getDefaultMentionRoleId(guildId);
  return interaction.reply(UI.setting(defaultMentionRoleId));
};
