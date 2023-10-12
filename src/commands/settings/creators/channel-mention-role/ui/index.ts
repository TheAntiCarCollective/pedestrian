import { compress } from "compress-tag";
import {
  ActionRowBuilder,
  EmbedBuilder,
  RoleSelectMenuBuilder,
  channelMention,
  roleMention,
} from "discord.js";

import { Color } from "../../../../../shared/discord";

export enum UIID {
  RoleSelect = "b5032c17-58a4-42a8-8ecd-930f12cc99cb",
}

// region Setting
// region Components
const roleSelect = (channelId: string, channelMentionRoleId: null | string) => {
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
  channelMentionRoleId: null | string,
) =>
  new ActionRowBuilder<RoleSelectMenuBuilder>().setComponents(
    roleSelect(channelId, channelMentionRoleId),
  );

const settingComponents = (
  channelId: string,
  channelMentionRoleId: null | string,
) => [roleSelectActionRow(channelId, channelMentionRoleId)];
// endregion

const settingEmbeds = (
  channelId: string,
  channelMentionRoleId: null | string,
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

const setting = (channelId: string, channelMentionRoleId: null | string) => ({
  components: settingComponents(channelId, channelMentionRoleId),
  embeds: settingEmbeds(channelId, channelMentionRoleId),
  ephemeral: true,
});
// endregion

export default {
  setting,
};
