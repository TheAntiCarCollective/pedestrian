import { compress } from "compress-tag";
import { EmbedBuilder, bold } from "discord.js";

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

const noSurvey = (title: string) => ({
  embeds: noSurveyEmbeds(title),
  ephemeral: true,
});
// endregion

export default {
  noSurvey,
};
