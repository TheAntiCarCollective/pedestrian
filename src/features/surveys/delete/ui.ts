import { bold, EmbedBuilder } from "discord.js";
import { compress } from "compress-tag";

import { Color } from "../../../services/discord";

// region Permissions Denied UI
const permissionsDeniedEmbeds = () => {
  const description =
    "You must have Manage Messages permissions to delete surveys.";

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

// region Deleted Survey
const deletedSurveyEmbeds = (title: string) => {
  const description = compress`
    Successfully deleted ${bold(title)}! A new survey titled ${bold(title)} can
    be created using the following command:
    \n${bold("/surveys create")}
  `;

  const embed = new EmbedBuilder()
    .setColor(Color.Success)
    .setDescription(description);

  return [embed];
};

export const deletedSurvey = (title: string) => ({
  embeds: deletedSurveyEmbeds(title),
  ephemeral: true,
});
// endregion
