import type { ChatInputCommandInteraction } from "discord.js";
import { EmbedBuilder, roleMention } from "discord.js";
import { compress } from "compress-tag";
import assert from "node:assert";

import { Color } from "../../../../services/discord";
import guildSettings from "../../../bot/settings/guild";

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
    creatorMentionRoleId: roleId ?? null,
  });

  let description: string;
  if (mentionRole === undefined) {
    description = compress`
      Successfully reset creator mention role! No role will be mentioned in
      creator posts unless an override exists for the creator channel or
      subscription.
    `;
  } else {
    description = compress`
      Successfully set ${mentionRole} as creator mention role! ${mentionRole}
      will be mentioned in creator posts unless an override exists for the
      creator channel or subscription.
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
