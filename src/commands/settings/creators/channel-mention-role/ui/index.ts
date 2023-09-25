import {
  ActionRowBuilder,
  channelMention,
  EmbedBuilder,
  roleMention,
  RoleSelectMenuBuilder,
} from "discord.js";
import { compress } from "compress-tag";

import { Color } from "../../../../../services/discord";

import { UIID } from "./constants";

// region Setting
// region Components
const roleSelect = (channelId: string, channelMentionRoleId: string | null) => {
  const roleSelectMenu = new RoleSelectMenuBuilder()
    .setCustomId(`${UIID.RoleSelect}${channelId}`)
    .setMinValues(0)
    .setPlaceholder("Select role to mention when creator uploads");

  const defaultValues = [];
  if (channelMentionRoleId !== null) {
    defaultValues.push({
      id: channelMentionRoleId,
      type: "role",
    });
  }

  const { data } = roleSelectMenu;
  // @ts-expect-error TODO Use builder
  // https://discord.com/developers/docs/interactions/message-components#select-menu-types
  data.default_values = defaultValues;

  return roleSelectMenu;
};

const roleSelectActionRow = (
  channelId: string,
  channelMentionRoleId: string | null,
) =>
  new ActionRowBuilder<RoleSelectMenuBuilder>().setComponents(
    roleSelect(channelId, channelMentionRoleId),
  );

const settingComponents = (
  channelId: string,
  channelMentionRoleId: string | null,
) => [roleSelectActionRow(channelId, channelMentionRoleId)];
// endregion

const settingEmbeds = (
  channelId: string,
  channelMentionRoleId: string | null,
) => {
  const mentionRole =
    channelMentionRoleId === null
      ? channelMentionRoleId
      : roleMention(channelMentionRoleId);

  const description = compress`
    Unless overridden, ${mentionRole ?? "no role"} will be mentioned when a
    creator uploads in ${channelMention(channelId)}.
  `;

  const embed = new EmbedBuilder()
    .setColor(Color.Informational)
    .setDescription(description);

  return [embed];
};

export const setting = (
  channelId: string,
  channelMentionRoleId: string | null,
) => ({
  components: settingComponents(channelId, channelMentionRoleId),
  embeds: settingEmbeds(channelId, channelMentionRoleId),
  ephemeral: true,
});
// endregion