import { bold, EmbedBuilder } from "discord.js";
import { compress } from "compress-tag";

import { Color } from "../../../services/discord";

// region No Survey
const noSurveyEmbeds = (title: string) => {
  const description = compress`
    No survey exists with the title ${bold(title)}! Retry this command with a
    different title or create the survey using the following command:
    \n${bold("/surveys create")}
  `;

  const embed = new EmbedBuilder()
    .setColor(Color.Error)
    .setDescription(description);

  return [embed];
};

export const noSurvey = (title: string) => ({
  embeds: noSurveyEmbeds(title),
  ephemeral: true,
});
// endregion