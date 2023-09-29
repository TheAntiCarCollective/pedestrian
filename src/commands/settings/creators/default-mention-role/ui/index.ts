import { compress } from "compress-tag";
import {
  ActionRowBuilder,
  EmbedBuilder,
  RoleSelectMenuBuilder,
  roleMention,
} from "discord.js";

import { Color } from "../../../../../services/discord";

export enum UIID {
  RoleSelect = "cb428095-e152-4519-9b65-42ac7afc6cec",
}

// region Setting
// region Components
const roleSelect = (defaultMentionRoleId: null | string) => {
  const roleSelectMenu = new RoleSelectMenuBuilder()
    .setCustomId(UIID.RoleSelect)
    .setMinValues(0)
    .setPlaceholder("Select role to mention when creator uploads");

  const defaultValues = [];
  if (defaultMentionRoleId !== null) {
    defaultValues.push({
      id: defaultMentionRoleId,
      type: "role",
    });
  }

  const { data } = roleSelectMenu;
  // @ts-expect-error TODO Use builder
  // https://discord.com/developers/docs/interactions/message-components#select-menu-types
  data.default_values = defaultValues;

  return roleSelectMenu;
};

const roleSelectActionRow = (defaultMentionRoleId: null | string) =>
  new ActionRowBuilder<RoleSelectMenuBuilder>().setComponents(
    roleSelect(defaultMentionRoleId),
  );

const settingComponents = (defaultMentionRoleId: null | string) => [
  roleSelectActionRow(defaultMentionRoleId),
];
// endregion

const settingEmbeds = (defaultMentionRoleId: null | string) => {
  const mentionRole =
    defaultMentionRoleId === null
      ? defaultMentionRoleId
      : roleMention(defaultMentionRoleId);

  const description = compress`
    Unless overridden, ${mentionRole ?? "no role"} will be mentioned when a
    creator uploads.
  `;

  const embed = new EmbedBuilder()
    .setColor(Color.Informational)
    .setDescription(description);

  return [embed];
};

const setting = (defaultMentionRoleId: null | string) => ({
  components: settingComponents(defaultMentionRoleId),
  embeds: settingEmbeds(defaultMentionRoleId),
  ephemeral: true,
});
// endregion

export default {
  setting,
};
