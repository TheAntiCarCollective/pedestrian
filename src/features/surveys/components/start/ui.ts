import type { GuildMember } from "discord.js";
import {
  ActionRowBuilder,
  bold,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  italic,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { compress } from "compress-tag";
import assert, { fail as error } from "node:assert";

import { Color } from "../../../../services/discord";

import type Context from "./context";
import * as withContext from "./context";
import ComponentId from "./components";
import * as ui from "../../ui";
import {
  isMultipleChoice,
  isOpen,
  isSelected,
  isSkipped,
} from "../../functions";
import { surveyLinkActionRow } from "../../ui";

// region Answer
// region Choice Select
const choiceSelectMenu = (context: Context) => {
  const question = withContext.getQuestion(context, isMultipleChoice);
  const answer = context.answers[context.selectedIndex] ?? [];
  assert(isSelected(answer));

  const { choices, minValues, maxValues } = question;
  const { length: numberOfChoices } = choices;

  const options = choices.map(({ label, description }, index) => {
    const choice = new StringSelectMenuOptionBuilder()
      .setDefault(answer.includes(index))
      .setLabel(label)
      .setValue(`${index}`);

    return description === "" ? choice : choice.setDescription(description);
  });

  return new StringSelectMenuBuilder()
    .setCustomId(`${ComponentId.ChoiceSelectMenu}${context.sessionId}`)
    .setOptions(options)
    .setMinValues(Math.min(minValues, numberOfChoices))
    .setMaxValues(Math.min(maxValues, numberOfChoices));
};

const selectChoiceActionRow = (context: Context) =>
  new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
    choiceSelectMenu(context),
  );
// endregion

// region Question Buttons
const previousQuestionButton = (context: Context) => {
  const answer = context.answers[context.selectedIndex];
  let valid = context.selectedIndex > 0;
  valid = valid && answer !== undefined;

  return new ButtonBuilder()
    .setCustomId(`${ComponentId.PreviousQuestionButton}${context.sessionId}`)
    .setDisabled(!valid)
    .setEmoji("⏮️")
    .setLabel("| Previous Question")
    .setStyle(ButtonStyle.Primary);
};

const nextQuestionButton = (context: Context) => {
  const { length: numberOfQuestions } = withContext.getQuestions(context);
  const answer = context.answers[context.selectedIndex];

  let valid = context.selectedIndex + 1 < numberOfQuestions;
  valid = valid && answer !== undefined;

  return new ButtonBuilder()
    .setCustomId(`${ComponentId.NextQuestionButton}${context.sessionId}`)
    .setDisabled(!valid)
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
const answerButton = (context: Context) => {
  const question = withContext.getQuestion(context);

  return new ButtonBuilder()
    .setCustomId(`${ComponentId.AnswerButton}${context.sessionId}`)
    .setDisabled(isMultipleChoice(question))
    .setEmoji("🙋")
    .setLabel("| Answer")
    .setStyle(ButtonStyle.Success);
};

const skipAnswerButton = ({ sessionId }: Context) =>
  new ButtonBuilder()
    .setCustomId(`${ComponentId.SkipAnswerButton}${sessionId}`)
    .setEmoji("🙅")
    .setLabel("| Skip Answer")
    .setStyle(ButtonStyle.Danger);

const answerButtonsActionRow = (context: Context) =>
  new ActionRowBuilder<ButtonBuilder>().setComponents(
    skipAnswerButton(context),
    answerButton(context),
  );
// endregion

// region Survey Buttons
const completeButton = (context: Context) => {
  const { length: numberOfQuestions } = withContext.getQuestions(context);
  const { length: numberOfAnswers } = context.answers;
  const valid = numberOfQuestions === numberOfAnswers;

  return new ButtonBuilder()
    .setCustomId(`${ComponentId.CompleteButton}${context.sessionId}`)
    .setDisabled(!valid)
    .setEmoji("✅")
    .setLabel("| Complete Survey")
    .setStyle(ButtonStyle.Success);
};

const cancelButton = ({ sessionId }: Context) =>
  new ButtonBuilder()
    .setCustomId(`${ComponentId.CancelButton}${sessionId}`)
    .setEmoji("❌")
    .setLabel("| Cancel")
    .setStyle(ButtonStyle.Secondary);

const surveyButtonsActionRow = (context: Context) =>
  new ActionRowBuilder<ButtonBuilder>().setComponents(
    ui.surveyLinkButton(context.survey),
    cancelButton(context),
    completeButton(context),
  );
// endregion

const answerComponents = (context: Context) => {
  const components = [];
  const question = withContext.getQuestion(context);

  if (isMultipleChoice(question)) {
    components.push(selectChoiceActionRow(context));
  }

  components.push(questionButtonsActionRow(context));
  components.push(answerButtonsActionRow(context));
  components.push(surveyButtonsActionRow(context));

  return components;
};

const answerEmbed = (context: Context) => {
  const question = withContext.getQuestion(context);
  const answer = context.answers[context.selectedIndex];

  let color: Color;
  let description: string;

  if (answer === undefined) {
    color = Color.Error;
    description = italic("You have not answered this question...");
  } else if (isSkipped(answer)) {
    color = Color.Warning;
    description = italic("You have skipped answering this question...");
  } else if (isOpen(answer)) {
    color = Color.Success;
    description = answer;
  } else if (isMultipleChoice(question)) {
    color = Color.Success;
    description = question.choices
      .filter((_, index) => answer.includes(index))
      .reduce((string, { label, description }) => {
        if (string !== "") string += "\n";
        string += `* ${label}`;
        if (description !== "") string += `\n${italic(description)}`;
        return string;
      }, "");

    description =
      description === ""
        ? italic("You have not selected any choices for this question...")
        : description.substring(0, 4096);
  } else {
    error();
  }

  return new EmbedBuilder()
    .setColor(color)
    .setDescription(description)
    .setTitle("Your Answer");
};

const answerEmbeds = (
  context: Context,
  surveyCreator: GuildMember | undefined,
) => [
  ui.questionEmbed(context.survey, surveyCreator, context.selectedIndex),
  answerEmbed(context),
];

export const answer = (
  context: Context,
  surveyCreator: GuildMember | undefined,
) => ({
  components: answerComponents(context),
  embeds: answerEmbeds(context, surveyCreator),
  ephemeral: true,
});
// endregion

// region Answer Modal
const answerInput = (context: Context) => {
  const answer = context.answers[context.selectedIndex];
  assert(answer === undefined || isSkipped(answer) || isOpen(answer));

  return new TextInputBuilder()
    .setCustomId(ComponentId.AnswerInput)
    .setLabel("Answer")
    .setMaxLength(4000)
    .setStyle(TextInputStyle.Paragraph)
    .setValue(answer ?? "");
};

const answerActionRow = (context: Context) =>
  new ActionRowBuilder<TextInputBuilder>().setComponents(answerInput(context));

export const answerModal = (context: Context) =>
  new ModalBuilder()
    .setComponents(answerActionRow(context))
    .setCustomId(`${ComponentId.AnswerModal}${context.sessionId}`)
    .setTitle(`Question #${context.selectedIndex + 1}`);
// endregion

// region Cancelled
const cancelledComponents = ({ survey }: Context) => [
  ui.surveyLinkActionRow(survey),
];

const cancelledEmbeds = ({ survey }: Context) => {
  const { title } = survey;
  const description = compress`
    \nSuccessfully cancelled completing ${bold(title)}! Your answers have been
    discarded and no changes have been made. You may retry using the link below
    or the following command:
    \n${bold("/surveys search")}
  `;

  const embed = new EmbedBuilder()
    .setColor(Color.Warning)
    .setDescription(description)
    .setTitle(title);

  return [embed];
};

export const cancelled = (context: Context) => ({
  components: cancelledComponents(context),
  embeds: cancelledEmbeds(context),
});
// endregion

// region Completed
const completedComponents = ({ survey }: Context) => [
  surveyLinkActionRow(survey),
];

const completedEmbeds = ({ survey }: Context) => {
  const { title } = survey;
  const description = compress`
    \nSuccessfully completed ${bold(title)}! Your answers have been saved and
    can be viewed using the link below or the following command:
    \n${bold("/surveys search")}
  `;

  const embed = new EmbedBuilder()
    .setColor(Color.Success)
    .setDescription(description)
    .setTitle(title);

  return [embed];
};

export const completed = (context: Context) => ({
  components: completedComponents(context),
  embeds: completedEmbeds(context),
});
// endregion
