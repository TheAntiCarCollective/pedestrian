import type { GuildMember } from "discord.js";

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SnowflakeUtil,
} from "discord.js";
import assert from "node:assert";

import type { PartialSurvey, Survey } from "../types";

import { Color } from "../../../shared/discord";
import { surveyLink } from "../functions";

export enum UIID {
  StartSurveyButton = "d9e2478e-6ae5-4756-baee-e48240fd5a42",
  SurveyResultsButton = "47056fde-668f-4234-99ce-9fb3380a30e5",
}

// region Survey Link Button
const surveyLinkButton = (survey: PartialSurvey) =>
  new ButtonBuilder()
    .setEmoji("🔗")
    .setLabel("| Survey")
    .setStyle(ButtonStyle.Link)
    .setURL(surveyLink(survey));

const surveyLinkActionRow = (survey: PartialSurvey) =>
  new ActionRowBuilder<ButtonBuilder>().setComponents(
    // prettier-ignore
    surveyLinkButton(survey),
  );

const surveyLinkComponents = (survey: PartialSurvey) => [
  surveyLinkActionRow(survey),
];
// endregion

// region Question Embed
const questionEmbed = (
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
    .setCustomId(`${UIID.StartSurveyButton}${id}`)
    .setEmoji("🔰")
    .setLabel("| Start Survey")
    .setStyle(ButtonStyle.Success);

const surveyResultsButton = ({ id }: Survey) =>
  new ButtonBuilder()
    .setCustomId(`${UIID.SurveyResultsButton}${id}`)
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

const surveyComponents = (survey: Omit<Survey, "id"> | Survey) => {
  const components = [];

  if ("id" in survey) {
    components.push(
      startSurveyActionRow(survey),
      surveyResultsActionRow(survey),
    );
  }

  return components;
};

const surveyEmbeds = (
  survey: Omit<Survey, "id"> | Survey,
  member: GuildMember | undefined,
) => {
  const { description, questions, title } = survey;
  const iconURL = member?.displayAvatarURL();
  const name = member?.displayName;

  const author = name === undefined ? null : { iconURL, name };
  const footer = { iconURL, text: title };

  const numberOfQuestionsField = {
    inline: true,
    name: "# of Questions",
    value: `${questions.length}`,
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

const survey = (
  survey: Omit<Survey, "id"> | Survey,
  member: GuildMember | undefined,
) => ({
  components: surveyComponents(survey),
  embeds: surveyEmbeds(survey, member),
});
// endregion

export default {
  questionEmbed,
  survey,
  surveyLinkButton,
  surveyLinkComponents,
};
