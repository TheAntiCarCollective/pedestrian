import type { ChatInputCommandInteraction } from "discord.js";
import { GuildMember, PermissionFlagsBits } from "discord.js";
import assert from "node:assert";

import guildSettings from "../../bot/settings/guild";

import * as ui from "./ui";

export enum Option {
  Role = "role",
}

const checkPermissionsResponse = (interaction: ChatInputCommandInteraction) => {
  const { member } = interaction;
  assert(member instanceof GuildMember);
  const { permissions } = member;

  if (permissions.has(PermissionFlagsBits.ManageRoles)) return undefined;
  return interaction.reply(ui.permissionsDenied());
};

export default async (interaction: ChatInputCommandInteraction) => {
  const { guildId, options } = interaction;
  assert(guildId !== null);

  const response = checkPermissionsResponse(interaction);
  if (response !== undefined) return response;

  const { id: roleId } = options.getRole(Option.Role) ?? {};
  const surveyCreatorRoleId = roleId ?? null;

  await guildSettings({
    id: guildId,
    surveyCreatorRoleId,
  });

  return interaction.reply(ui.configuredRole(roleId));
};
