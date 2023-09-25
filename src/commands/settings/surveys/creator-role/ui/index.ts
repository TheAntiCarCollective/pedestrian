import {
  ActionRowBuilder,
  EmbedBuilder,
  roleMention,
  RoleSelectMenuBuilder,
} from "discord.js";

import { UIID } from "./constants";
import { Color } from "../../../../../services/discord";

// region Setting
// region Components
const roleSelect = (surveyCreatorRoleId: string | null) => {
  const roleSelectMenu = new RoleSelectMenuBuilder()
    .setCustomId(UIID.RoleSelect)
    .setMinValues(0)
    .setPlaceholder("Select role to allow creation of surveys");

  const defaultValues = [];
  if (surveyCreatorRoleId !== null) {
    defaultValues.push({
      id: surveyCreatorRoleId,
      type: "role",
    });
  }

  const { data } = roleSelectMenu;
  // @ts-expect-error TODO Use builder
  // https://discord.com/developers/docs/interactions/message-components#select-menu-types
  data.default_values = defaultValues;

  return roleSelectMenu;
};

const roleSelectActionRow = (surveyCreatorRoleId: string | null) =>
  new ActionRowBuilder<RoleSelectMenuBuilder>().setComponents(
    roleSelect(surveyCreatorRoleId),
  );

const settingComponents = (surveyCreatorRoleId: string | null) => [
  roleSelectActionRow(surveyCreatorRoleId),
];
// endregion

const settingEmbeds = (surveyCreatorRoleId: string | null) => {
  // prettier-ignore
  const orRole = surveyCreatorRoleId === null ? " " : ` or ${roleMention(surveyCreatorRoleId)} `;
  const description = `Only members that have Manage Messages permissions${orRole}can create surveys.`;

  const embed = new EmbedBuilder()
    .setColor(Color.Informational)
    .setDescription(description);

  return [embed];
};

export const setting = (surveyCreatorRoleId: string | null) => ({
  components: settingComponents(surveyCreatorRoleId),
  embeds: settingEmbeds(surveyCreatorRoleId),
  ephemeral: true,
});
// endregion
