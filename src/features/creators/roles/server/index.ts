import type { ChatInputCommandInteraction } from "discord.js";
import { EmbedBuilder, roleMention } from "discord.js";
import { compress } from "compress-tag";

import { Color, JsonError } from "../../../../services/discord";
import guildSettings from "../../../bot/settings/guild";

export enum Option {
  ROLE = "role",
}

export default async (interaction: ChatInputCommandInteraction) => {
  const { guildId, options } = interaction;
  if (guildId === null) throw new JsonError(interaction);
  const { id: roleId } = options.getRole(Option.ROLE) ?? {};

  const newGuildSettings = await guildSettings({
    id: guildId,
    creatorMentionRoleId: roleId ?? null,
  });

  const { creatorMentionRoleId: newCreatorMentionRoleId } = newGuildSettings;

  const mentionRole =
    newCreatorMentionRoleId === null
      ? newCreatorMentionRoleId
      : roleMention(newCreatorMentionRoleId);

  let description: string;
  if (mentionRole === null) {
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
    .setColor(Color.SUCCESS)
    .setDescription(description);

  return interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
};
