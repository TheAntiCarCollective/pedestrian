import {
  ActionRowBuilder,
  EmbedBuilder,
  roleMention,
  RoleSelectMenuBuilder,
} from "discord.js";
import { compress } from "compress-tag";

import { Color } from "../../../../../services/discord";

import { UIID } from "./constants";

// region Setting
// region Components
const roleSelect = (defaultMentionRoleId: string | null) => {
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

const roleSelectActionRow = (defaultMentionRoleId: string | null) =>
  new ActionRowBuilder<RoleSelectMenuBuilder>().setComponents(
    roleSelect(defaultMentionRoleId),
  );

const settingComponents = (defaultMentionRoleId: string | null) => [
  roleSelectActionRow(defaultMentionRoleId),
];
// endregion

const settingEmbeds = (defaultMentionRoleId: string | null) => {
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

export const setting = (defaultMentionRoleId: string | null) => ({
  components: settingComponents(defaultMentionRoleId),
  embeds: settingEmbeds(defaultMentionRoleId),
  ephemeral: true,
});
// endregion