import type { ChatInputCommandInteraction } from "discord.js";
import { EmbedBuilder, roleMention } from "discord.js";
import assert from "node:assert";

import { Color } from "../../../services/discord";
import guildSettings from "../../bot/settings/guild";
import { compress } from "compress-tag";

export enum Option {
  Role = "role",
}

export default async (interaction: ChatInputCommandInteraction) => {
  const { guildId, options } = interaction;
  assert(guildId !== null);

  const { id: roleId } = options.getRole(Option.Role) ?? {};
  const mentionRole = roleId === undefined ? roleId : roleMention(roleId);

  await guildSettings({
    id: guildId,
    surveyCreatorRoleId: roleId ?? null,
  });

  let description: string;
  if (mentionRole === undefined) {
    description = compress`
      Successfully reset survey creator role! Only users with Manage Messages
      permissions can create surveys.
    `;
  } else {
    description = compress`
      Successfully set ${mentionRole} as survey creator role! Only users with
      Manage Messages permissions or ${mentionRole} can create surveys.
    `;
  }

  const embed = new EmbedBuilder()
    .setColor(Color.Success)
    .setDescription(description);

  return interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
};
