import { EmbedBuilder, roleMention } from "discord.js";
import { compress } from "compress-tag";

import { Color } from "../../../services/discord";

// region Permissions Denied
const permissionsDeniedEmbeds = () => {
  const description =
    "You must have Manage Roles permissions to configure survey creator role.";

  const embed = new EmbedBuilder()
    .setColor(Color.Error)
    .setDescription(description);

  return [embed];
};

export const permissionsDenied = () => ({
  embeds: permissionsDeniedEmbeds(),
  ephemeral: true,
});
// endregion

// region Configured Role
const configuredRoleEmbeds = (roleId: string | undefined) => {
  const mentionRole = roleId === undefined ? roleId : roleMention(roleId);

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

  return [embed];
};

export const configuredRole = (roleId: string | undefined) => ({
  embeds: configuredRoleEmbeds(roleId),
  ephemeral: true,
});
// endregion
