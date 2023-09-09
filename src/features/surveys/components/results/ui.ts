import type { BaseMessageOptions, GuildMember } from "discord.js";
import {
  ActionRowBuilder,
  bold,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  italic,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { fail as error } from "node:assert";

import { Color } from "../../../../services/discord";

import type Context from "./context";
import * as withContext from "./context";
import ComponentId from "./components";
import type { Survey } from "../../types";
import * as ui from "../../ui";
import { isOpen, isOpenAnswer, isSkipped } from "../../functions";
import { QuestionType } from "../../constants";

// region No Results
const noResultsEmbeds = ({ title }: Survey) => {
  const description = `
    No results currently exist for ${bold(title)}! Results will be available
    when someone completes the survey.
  `;

  const embed = new EmbedBuilder()
    .setColor(Color.Error)
    .setDescription(description);

  return [embed];
};

export const noResults = (survey: Survey) => ({
  embeds: noResultsEmbeds(survey),
  ephemeral: true,
});
// endregion

// region Results
// region Components
// region Question Buttons
const previousQuestionButton = ({
  sessionId,
  selectedQuestionIndex,
}: Context) =>
  new ButtonBuilder()
    .setCustomId(`${ComponentId.PreviousQuestionButton}${sessionId}`)
    .setDisabled(selectedQuestionIndex <= 0)
    .setEmoji("⏮️")
    .setLabel("| Previous Question")
    .setStyle(ButtonStyle.Primary);

const nextQuestionButton = (context: Context) => {
  const { length: numberOfQuestions } = withContext.getQuestions(context);

  return new ButtonBuilder()
    .setCustomId(`${ComponentId.NextQuestionButton}${context.sessionId}`)
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
const previousAnswerButton = ({ sessionId, selectedAnswerIndex }: Context) =>
  new ButtonBuilder()
    .setCustomId(`${ComponentId.PreviousAnswerButton}${sessionId}`)
    .setDisabled(selectedAnswerIndex <= 0)
    .setEmoji("⏮️")
    .setLabel("| Previous Answer")
    .setStyle(ButtonStyle.Primary);

const answerNumberButton = (context: Context) => {
  const { length: numberOfAnswers } = withContext.getAnswers(context);

  return new ButtonBuilder()
    .setCustomId(`${ComponentId.AnswerNumberButton}${context.sessionId}`)
    .setDisabled(numberOfAnswers <= 1)
    .setEmoji("#️⃣")
    .setLabel("| Go to Answer #")
    .setStyle(ButtonStyle.Secondary);
};

const nextAnswerButton = (context: Context) => {
  const { length: numberOfAnswers } = withContext.getAnswers(context);

  return new ButtonBuilder()
    .setCustomId(`${ComponentId.NextAnswerButton}${context.sessionId}`)
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
    .setCustomId(`${ComponentId.SurveyCsvButton}${sessionId}`)
    .setEmoji("⬇️")
    .setLabel("| Download Survey CSV")
    .setStyle(ButtonStyle.Secondary);

const answersCsvButton = ({ sessionId }: Context) =>
  new ButtonBuilder()
    .setCustomId(`${ComponentId.AnswersCsvButton}${sessionId}`)
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
    .setCustomId(`${ComponentId.CloseButton}${sessionId}`)
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

  components.push(csvButtonsActionRow(context));
  components.push(closeActionRow(context));
  return components;
};
// endregion

const resultsEmbed = (context: Context) => {
  const { type } = withContext.getQuestion(context);
  const answers = withContext.getAnswers(context);
  const skippedAnswers = answers.filter(isSkipped);

  const fields = [];
  fields.push({
    name: "# of Answers",
    value: `${answers.length}`,
    inline: true,
  });
  fields.push({
    name: "# of Skipped Answers",
    value: `${skippedAnswers.length}`,
    inline: true,
  });

  switch (type) {
    case QuestionType.MultipleChoice:
      return new EmbedBuilder()
        .setColor(Color.Informational)
        .setFields(fields)
        .setImage(`attachment://answers.png`)
        .setTitle("Answers");
    case QuestionType.OpenAnswer: {
      const answer = withContext.getAnswer(context);

      let color: Color;
      let description: string;

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
  ui.questionEmbed(context.survey, surveyCreator, context.selectedQuestionIndex),
  resultsEmbed(context),
];

export const results = (
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
    .setCustomId(ComponentId.AnswerNumberInput)
    .setLabel(`Answer #(1 - ${numberOfAnswers})`)
    .setMaxLength(2)
    .setStyle(TextInputStyle.Short)
    .setValue(`${context.selectedAnswerIndex + 1}`);
};

const answerNumberActionRow = (context: Context) =>
  new ActionRowBuilder<TextInputBuilder>().setComponents(
    answerNumberInput(context),
  );

export const answerNumberModal = (context: Context) =>
  new ModalBuilder()
    .setComponents(answerNumberActionRow(context))
    .setCustomId(`${ComponentId.AnswerNumberModal}${context.sessionId}`)
    .setTitle("Go to Answer #");
// endregion
