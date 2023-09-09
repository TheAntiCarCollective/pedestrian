import type { GuildMember } from "discord.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SnowflakeUtil,
} from "discord.js";
import assert from "node:assert";

import { Color } from "../../services/discord";

import type { PartialSurvey, Survey } from "./types";
import ComponentId from "./components";
import { surveyLink } from "./functions";

// region Survey Link Button
export const surveyLinkButton = (survey: PartialSurvey) =>
  new ButtonBuilder()
    .setEmoji("🔗")
    .setLabel("| Survey")
    .setStyle(ButtonStyle.Link)
    .setURL(surveyLink(survey));

export const surveyLinkActionRow = (survey: PartialSurvey) =>
  new ActionRowBuilder<ButtonBuilder>().setComponents(
    // prettier-ignore
    surveyLinkButton(survey),
  );
// endregion

// region Question Embed
export const questionEmbed = (
  { id: surveyId, questions }: Survey,
  surveyCreator: GuildMember | undefined,
  selectedIndex: number,
) => {
  const questionNumber = selectedIndex + 1;
  const { length: numberOfQuestions } = questions;

  const text = `Question ${questionNumber} of ${numberOfQuestions}`;
  const iconURL = surveyCreator?.displayAvatarURL();

  const author = { iconURL, name: text };
  const footer = { iconURL, text };

  const timestamp = SnowflakeUtil.timestampFrom(surveyId);

  const question = questions[selectedIndex];
  assert(question !== undefined);
  const { ask, description } = question;

  const embed = new EmbedBuilder()
    .setAuthor(author)
    .setColor(Color.Informational)
    .setFooter(footer)
    .setTimestamp(timestamp)
    .setTitle(ask);

  return description.length > 0 ? embed.setDescription(description) : embed;
};
// endregion

// region Survey
const startSurveyButton = ({ id }: Survey) =>
  new ButtonBuilder()
    .setCustomId(`${ComponentId.StartSurveyButton}${id}`)
    .setEmoji("🔰")
    .setLabel("| Start Survey")
    .setStyle(ButtonStyle.Success);

const surveyResultsButton = ({ id }: Survey) =>
  new ButtonBuilder()
    .setCustomId(`${ComponentId.SurveyResultsButton}${id}`)
    .setEmoji("📊")
    .setLabel("| View Results")
    .setStyle(ButtonStyle.Primary);

const startSurveyActionRow = (survey: Survey) =>
  new ActionRowBuilder<ButtonBuilder>().setComponents(
    startSurveyButton(survey),
  );

const surveyResultsActionRow = (survey: Survey) =>
  new ActionRowBuilder<ButtonBuilder>().setComponents(
    surveyResultsButton(survey),
  );

const surveyComponents = (survey: Survey | Omit<Survey, "id">) => {
  const components = [];

  if ("id" in survey) {
    components.push(startSurveyActionRow(survey));
    components.push(surveyResultsActionRow(survey));
  }

  return components;
};

const surveyEmbeds = (
  survey: Survey | Omit<Survey, "id">,
  member: GuildMember,
) => {
  const { title, description, questions } = survey;
  const iconURL = member.displayAvatarURL();
  const name = member.displayName;

  const author = { iconURL, name };
  const footer = { iconURL, text: title };

  const numberOfQuestionsField = {
    name: "# of Questions",
    value: `${questions.length}`,
    inline: true,
  };

  const id = "id" in survey ? survey.id : undefined;
  const color = id === undefined ? Color.Error : Color.Informational;
  const timestamp =
    id === undefined ? new Date() : SnowflakeUtil.timestampFrom(id);

  const embed = new EmbedBuilder()
    .setAuthor(author)
    .setColor(color)
    .setFields(numberOfQuestionsField)
    .setFooter(footer)
    .setTimestamp(timestamp)
    .setTitle(title);

  return [description === "" ? embed : embed.setDescription(description)];
};

export const survey = (
  survey: Survey | Omit<Survey, "id">,
  member: GuildMember,
) => ({
  components: surveyComponents(survey),
  embeds: surveyEmbeds(survey, member),
});
// endregion
