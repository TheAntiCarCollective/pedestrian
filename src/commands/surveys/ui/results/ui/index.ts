import type { BaseMessageOptions, GuildMember } from "discord.js";

import { compress } from "compress-tag";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  bold,
  italic,
} from "discord.js";
import { fail as error } from "node:assert";

import type { Survey } from "../../../types";
import type { Context } from "../context";

import { Color } from "../../../../../services/discord";
import { QuestionType } from "../../../constants";
import { isOpen, isOpenAnswer, isSkipped } from "../../../functions";
import UI from "../../../ui";
import * as withContext from "../context";

export enum UIID {
  AnswerNumberButton = "62449cfb-bb73-40f0-8e5d-83159e4ff47d",
  AnswerNumberInput = "ANSWER_NUMBER_INPUT",
  AnswerNumberModal = "c74d03c8-1826-4980-863d-8a62c1a0af2b",
  AnswersCsvButton = "611e462c-44ab-40f1-8796-19bffe0d4af7",
  CloseButton = "30001502-fb22-4f11-bffa-c105fbbb6b02",
  NextAnswerButton = "27d015cf-e476-4979-bb5b-5775e021a636",
  NextQuestionButton = "b2907ede-b74c-4fab-adf7-345e6fed9351",
  PreviousAnswerButton = "9a90f23d-867c-4ecb-a38f-119573cfd99b",
  PreviousQuestionButton = "6bc8e916-a8d3-45a1-95f8-64555716c4bf",
  SurveyCsvButton = "735f1efd-7cc4-4a8a-a3f5-94e85cd1c1b6",
}

// region No Results
const noResultsEmbeds = ({ title }: Survey) => {
  const description = compress`
    No results currently exist for ${bold(title)}! Results will be available
    when someone completes the survey.
  `;

  const embed = new EmbedBuilder()
    .setColor(Color.Error)
    .setDescription(description);

  return [embed];
};

const noResults = (survey: Survey) => ({
  embeds: noResultsEmbeds(survey),
  ephemeral: true,
});
// endregion

// region Results
// region Components
// region Question Buttons
const previousQuestionButton = ({
  selectedQuestionIndex,
  sessionId,
}: Context) =>
  new ButtonBuilder()
    .setCustomId(`${UIID.PreviousQuestionButton}${sessionId}`)
    .setDisabled(selectedQuestionIndex <= 0)
    .setEmoji("⏮️")
    .setLabel("| Previous Question")
    .setStyle(ButtonStyle.Primary);

const nextQuestionButton = (context: Context) => {
  const { length: numberOfQuestions } = withContext.getQuestions(context);

  return new ButtonBuilder()
    .setCustomId(`${UIID.NextQuestionButton}${context.sessionId}`)
    .setDisabled(context.selectedQuestionIndex + 1 >= numberOfQuestions)
    .setEmoji("⏭️")
    .setLabel("| Next Question")
    .setStyle(ButtonStyle.Primary);
};

const questionButtonsActionRow = (context: Context) =>
  new ActionRowBuilder<ButtonBuilder>().setComponents(
    previousQuestionButton(context),
    nextQuestionButton(context),
  );
// endregion

// region Answer Buttons
const previousAnswerButton = ({ selectedAnswerIndex, sessionId }: Context) =>
  new ButtonBuilder()
    .setCustomId(`${UIID.PreviousAnswerButton}${sessionId}`)
    .setDisabled(selectedAnswerIndex <= 0)
    .setEmoji("⏮️")
    .setLabel("| Previous Answer")
    .setStyle(ButtonStyle.Primary);

const answerNumberButton = (context: Context) => {
  const { length: numberOfAnswers } = withContext.getAnswers(context);

  return new ButtonBuilder()
    .setCustomId(`${UIID.AnswerNumberButton}${context.sessionId}`)
    .setDisabled(numberOfAnswers <= 1)
    .setEmoji("#️⃣")
    .setLabel("| Go to Answer #")
    .setStyle(ButtonStyle.Secondary);
};

const nextAnswerButton = (context: Context) => {
  const { length: numberOfAnswers } = withContext.getAnswers(context);

  return new ButtonBuilder()
    .setCustomId(`${UIID.NextAnswerButton}${context.sessionId}`)
    .setDisabled(context.selectedAnswerIndex + 1 >= numberOfAnswers)
    .setEmoji("⏭️")
    .setLabel("| Next Answer")
    .setStyle(ButtonStyle.Primary);
};

const answerButtonsActionRow = (context: Context) =>
  new ActionRowBuilder<ButtonBuilder>().setComponents(
    previousAnswerButton(context),
    answerNumberButton(context),
    nextAnswerButton(context),
  );
// endregion

// region CSV Buttons
const surveyCsvButton = ({ sessionId }: Context) =>
  new ButtonBuilder()
    .setCustomId(`${UIID.SurveyCsvButton}${sessionId}`)
    .setEmoji("⬇️")
    .setLabel("| Download Survey CSV")
    .setStyle(ButtonStyle.Secondary);

const answersCsvButton = ({ sessionId }: Context) =>
  new ButtonBuilder()
    .setCustomId(`${UIID.AnswersCsvButton}${sessionId}`)
    .setEmoji("⬇️")
    .setLabel("| Download Answers CSV")
    .setStyle(ButtonStyle.Secondary);

const csvButtonsActionRow = (context: Context) =>
  new ActionRowBuilder<ButtonBuilder>().setComponents(
    surveyCsvButton(context),
    answersCsvButton(context),
  );
// endregion

// region Close
const closeButton = ({ sessionId }: Context) =>
  new ButtonBuilder()
    .setCustomId(`${UIID.CloseButton}${sessionId}`)
    .setEmoji("❌")
    .setLabel("| Close")
    .setStyle(ButtonStyle.Secondary);

const closeActionRow = (context: Context) =>
  new ActionRowBuilder<ButtonBuilder>().setComponents(closeButton(context));
// endregion

const resultsComponents = (context: Context) => {
  const components = [];
  components.push(questionButtonsActionRow(context));

  const question = withContext.getQuestion(context);
  if (isOpenAnswer(question)) {
    components.push(answerButtonsActionRow(context));
  }

  return [...components, csvButtonsActionRow(context), closeActionRow(context)];
};
// endregion

const resultsEmbed = (context: Context) => {
  const { type } = withContext.getQuestion(context);
  const answers = withContext.getAnswers(context);
  const skippedAnswers = answers.filter(isSkipped);

  const fields = [];
  fields.push(
    {
      inline: true,
      name: "# of Answers",
      value: `${answers.length}`,
    },
    {
      inline: true,
      name: "# of Skipped Answers",
      value: `${skippedAnswers.length}`,
    },
  );

  switch (type) {
    case QuestionType.MultipleChoice: {
      return new EmbedBuilder()
        .setColor(Color.Informational)
        .setFields(fields)
        .setImage(`attachment://answers.png`)
        .setTitle("Answers");
    }
    case QuestionType.OpenAnswer: {
      const answer = withContext.getAnswer(context);

      let color;
      let description;

      if (isSkipped(answer)) {
        color = Color.Warning;
        description = italic("This answer was skipped...");
      } else if (isOpen(answer)) {
        color = Color.Informational;
        description = answer;
      } else {
        error();
      }

      return new EmbedBuilder()
        .setColor(color)
        .setDescription(description)
        .setFields(fields)
        .setTitle(`Answer #${context.selectedAnswerIndex + 1}`);
    }
  }
};

const resultsEmbeds = (
  context: Context,
  surveyCreator: GuildMember | undefined,
) => [
  // prettier-ignore
  UI.questionEmbed(context.survey, surveyCreator, context.selectedQuestionIndex),
  resultsEmbed(context),
];

const results = (
  context: Context,
  surveyCreator: GuildMember | undefined,
  files: BaseMessageOptions["files"],
) => ({
  components: resultsComponents(context),
  embeds: resultsEmbeds(context, surveyCreator),
  ephemeral: true,
  files,
});
// endregion

// region Answer Number Modal
const answerNumberInput = (context: Context) => {
  const { length: numberOfAnswers } = withContext.getAnswers(context);

  return new TextInputBuilder()
    .setCustomId(UIID.AnswerNumberInput)
    .setLabel(`Answer #(1 - ${numberOfAnswers})`)
    .setMaxLength(2)
    .setStyle(TextInputStyle.Short)
    .setValue(`${context.selectedAnswerIndex + 1}`);
};

const answerNumberActionRow = (context: Context) =>
  new ActionRowBuilder<TextInputBuilder>().setComponents(
    answerNumberInput(context),
  );

const answerNumberModal = (context: Context) =>
  new ModalBuilder()
    .setComponents(answerNumberActionRow(context))
    .setCustomId(`${UIID.AnswerNumberModal}${context.sessionId}`)
    .setTitle("Go to Answer #");
// endregion

export default {
  answerNumberModal,
  noResults,
  results,
};
