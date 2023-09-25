import type { GuildMember } from "discord.js";
import {
  ActionRowBuilder,
  bold,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  roleMention,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { compress } from "compress-tag";

import { Color } from "../../../../services/discord";

import { UIID } from "./constants";
import type { Context } from "../context";
import * as withContext from "../context";
import type { PartialSurvey } from "../../types";
import * as ui from "../../ui";
import { isMultipleChoice, surveyLink } from "../../functions";
import { QuestionType, QuestionTypes } from "../../constants";

// region Permissions Denied
const permissionsDeniedEmbeds = (surveyCreatorRoleId: string | null) => {
  // prettier-ignore
  const orRole = surveyCreatorRoleId === null ? " " : ` or ${roleMention(surveyCreatorRoleId)} `;
  const description = `You must have Manage Messages permissions${orRole}to create surveys.`;

  const embed = new EmbedBuilder()
    .setColor(Color.Error)
    .setDescription(description);

  return [embed];
};

export const permissionsDenied = (surveyCreatorRoleId: string | null) => ({
  embeds: permissionsDeniedEmbeds(surveyCreatorRoleId),
  ephemeral: true,
});
// endregion

// region Survey Exists
const surveyExistsComponents = (survey: PartialSurvey) => [
  ui.surveyLinkActionRow(survey),
];

const surveyExistsEmbeds = (survey: PartialSurvey) => {
  const description = compress`
    Your request for creating a survey has been denied because this server
    already has a survey titled ${bold(survey.title)}:
    \n${surveyLink(survey)}
    \nRetry this command with a different title or use the following command to
    delete the survey:
    \n${bold("/surveys delete")}
  `;

  const embed = new EmbedBuilder()
    .setColor(Color.Error)
    .setDescription(description);

  return [embed];
};

export const surveyExists = (survey: PartialSurvey) => ({
  components: surveyExistsComponents(survey),
  embeds: surveyExistsEmbeds(survey),
  ephemeral: true,
});
// endregion

// region Question Modal
const questionAskInput = (context: Context) => {
  const { ask } = withContext.getQuestion(context);

  return new TextInputBuilder()
    .setCustomId(UIID.QuestionAskInput)
    .setLabel("Question")
    .setMaxLength(256)
    .setPlaceholder("What would you like to ask everyone?")
    .setStyle(TextInputStyle.Short)
    .setValue(ask);
};

const questionDescriptionInput = (context: Context) => {
  const { description } = withContext.getQuestion(context);
  const placeholder =
    "Optional | Use this to explain why your question is being asked.";

  return new TextInputBuilder()
    .setCustomId(UIID.QuestionDescriptionInput)
    .setLabel("Description")
    .setMaxLength(4000)
    .setPlaceholder(placeholder)
    .setRequired(false)
    .setStyle(TextInputStyle.Paragraph)
    .setValue(description);
};

const questionAskActionRow = (context: Context) =>
  new ActionRowBuilder<TextInputBuilder>().setComponents(
    questionAskInput(context),
  );

const questionDescriptionActionRow = (context: Context) =>
  new ActionRowBuilder<TextInputBuilder>().setComponents(
    questionDescriptionInput(context),
  );

export const questionModal = (context: Context) => {
  return new ModalBuilder()
    .setComponents(
      questionAskActionRow(context),
      questionDescriptionActionRow(context),
    )
    .setCustomId(`${UIID.QuestionModal}${context.sessionId}`)
    .setTitle(`Question #${context.selectedQuestionIndex + 1}`);
};
// endregion

// region Question
// region Components
// region Question Type Select
const questionTypeSelect = (context: Context) => {
  const { type } = withContext.getQuestion(context);
  const options = QuestionTypes.map((questionType) =>
    new StringSelectMenuOptionBuilder()
      .setDefault(questionType === type)
      .setLabel(questionType)
      .setValue(questionType),
  );

  return new StringSelectMenuBuilder()
    .setCustomId(`${UIID.QuestionTypeSelect}${context.sessionId}`)
    .setOptions(options);
};

const questionTypeSelectActionRow = (context: Context) =>
  new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
    questionTypeSelect(context),
  );
// endregion

// region Choice Select
const choiceSelect = (context: Context) => {
  const choices = withContext.getChoices(context);
  const options = choices.map(({ label, description }, index) => {
    const choice = new StringSelectMenuOptionBuilder()
      .setDefault(context.selectedChoiceIndex === index)
      .setLabel(label)
      .setValue(`${index}`);

    return description === "" ? choice : choice.setDescription(description);
  });

  return new StringSelectMenuBuilder()
    .setCustomId(`${UIID.ChoiceSelect}${context.sessionId}`)
    .setOptions(options);
};

const choiceSelectActionRow = (context: Context) =>
  new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
    choiceSelect(context),
  );
// endregion

// region Choice Buttons
const addChoiceButton = (context: Context) => {
  const { length: numberOfChoices } = withContext.getChoices(context);

  return new ButtonBuilder()
    .setCustomId(`${UIID.AddChoiceButton}${context.sessionId}`)
    .setDisabled(numberOfChoices >= 25)
    .setEmoji("➕")
    .setLabel("| Add Choice")
    .setStyle(ButtonStyle.Success);
};

const editChoiceButton = (context: Context) => {
  const { length: numberOfChoices } = withContext.getChoices(context);

  return new ButtonBuilder()
    .setCustomId(`${UIID.EditChoiceButton}${context.sessionId}`)
    .setDisabled(numberOfChoices === 0)
    .setEmoji("✏️")
    .setLabel("| Edit Choice")
    .setStyle(ButtonStyle.Secondary);
};

const editChoiceSettingsButton = ({ sessionId }: Context) =>
  new ButtonBuilder()
    .setCustomId(`${UIID.EditChoiceSettingsButton}${sessionId}`)
    .setEmoji("✏️")
    .setLabel("| Edit Settings")
    .setStyle(ButtonStyle.Secondary);

const removeChoiceButton = (context: Context) => {
  const { length: numberOfChoices } = withContext.getChoices(context);

  return new ButtonBuilder()
    .setCustomId(`${UIID.RemoveChoiceButton}${context.sessionId}`)
    .setDisabled(numberOfChoices === 0)
    .setEmoji("➖")
    .setLabel("| Remove Choice")
    .setStyle(ButtonStyle.Danger);
};

const choiceButtonsActionRow = (context: Context) =>
  new ActionRowBuilder<ButtonBuilder>().setComponents(
    removeChoiceButton(context),
    editChoiceButton(context),
    editChoiceSettingsButton(context),
    addChoiceButton(context),
  );
// endregion

// region Question Buttons
const addQuestionButton = (context: Context) => {
  const { length: numberOfQuestions } = withContext.getQuestions(context);
  let valid = withContext.isQuestionValid(context);
  valid = valid && numberOfQuestions < 25;

  return new ButtonBuilder()
    .setCustomId(`${UIID.AddQuestionButton}${context.sessionId}`)
    .setDisabled(!valid)
    .setEmoji("➕")
    .setLabel("| Add Question")
    .setStyle(ButtonStyle.Success);
};

const editQuestionButton = ({ sessionId }: Context) =>
  new ButtonBuilder()
    .setCustomId(`${UIID.EditQuestionButton}${sessionId}`)
    .setEmoji("✏️")
    .setLabel("| Edit Question")
    .setStyle(ButtonStyle.Secondary);

const removeQuestionButton = (context: Context) => {
  const { length: numberOfQuestions } = withContext.getQuestions(context);

  return new ButtonBuilder()
    .setCustomId(`${UIID.RemoveQuestionButton}${context.sessionId}`)
    .setDisabled(numberOfQuestions <= 1)
    .setEmoji("➖")
    .setLabel("| Remove Question")
    .setStyle(ButtonStyle.Danger);
};

const questionButtonsActionRow = (context: Context) =>
  new ActionRowBuilder<ButtonBuilder>().setComponents(
    removeQuestionButton(context),
    editQuestionButton(context),
    addQuestionButton(context),
  );
// endregion

// region Survey Buttons
const previousQuestionButton = (context: Context) => {
  let valid = withContext.isQuestionValid(context);
  valid = valid && context.selectedQuestionIndex > 0;

  return new ButtonBuilder()
    .setCustomId(`${UIID.PreviousQuestionButton}${context.sessionId}`)
    .setDisabled(!valid)
    .setEmoji("⏮️")
    .setLabel("| Previous Question")
    .setStyle(ButtonStyle.Primary);
};

const nextQuestionButton = (context: Context) => {
  const questionNumber = context.selectedQuestionIndex + 1;
  const { length: numberOfQuestions } = withContext.getQuestions(context);

  let valid = withContext.isQuestionValid(context);
  valid = valid && questionNumber < numberOfQuestions;

  return new ButtonBuilder()
    .setCustomId(`${UIID.NextQuestionButton}${context.sessionId}`)
    .setDisabled(!valid)
    .setEmoji("⏭️")
    .setLabel("| Next Question")
    .setStyle(ButtonStyle.Primary);
};

const createSurveyButton = (context: Context) => {
  const valid = withContext.isQuestionValid(context);

  return new ButtonBuilder()
    .setCustomId(`${UIID.CreateButton}${context.sessionId}`)
    .setDisabled(!valid)
    .setEmoji("✅")
    .setLabel("| Create Survey")
    .setStyle(ButtonStyle.Success);
};

const cancelSurveyButton = ({ sessionId }: Context) =>
  new ButtonBuilder()
    .setCustomId(`${UIID.CancelButton}${sessionId}`)
    .setEmoji("❌")
    .setLabel("| Cancel")
    .setStyle(ButtonStyle.Secondary);

const surveyButtonsActionRow = (context: Context) =>
  new ActionRowBuilder<ButtonBuilder>().setComponents(
    previousQuestionButton(context),
    nextQuestionButton(context),
    cancelSurveyButton(context),
    createSurveyButton(context),
  );
// endregion

const questionComponents = (context: Context) => {
  const question = withContext.getQuestion(context);
  const components = [];
  components.push(questionTypeSelectActionRow(context));

  switch (question.type) {
    case QuestionType.MultipleChoice: {
      const { choices } = question;
      if (choices.length > 0) components.push(choiceSelectActionRow(context));
      components.push(choiceButtonsActionRow(context));
    }
    // falls through
    case QuestionType.OpenAnswer: {
      components.push(
        questionButtonsActionRow(context),
        surveyButtonsActionRow(context),
      );
    }
  }

  return components;
};
// endregion

const questionEmbeds = (context: Context, member: GuildMember) => {
  const fields = [];
  const question = withContext.getQuestion(context);

  if (isMultipleChoice(question)) {
    const { minValues, maxValues } = question;

    fields.push(
      {
        name: "Minimum Choices to Select",
        value: `${minValues}`,
        inline: true,
      },
      {
        name: "Maximum Choices to Select",
        value: `${maxValues}`,
        inline: true,
      },
    );
  }

  const questionNumber = context.selectedQuestionIndex + 1;
  const { length: numberOfQuestions } = withContext.getQuestions(context);
  const text = `Question ${questionNumber} of ${numberOfQuestions}`;
  const iconURL = member.displayAvatarURL();

  const author = { iconURL, name: text };
  const footer = { iconURL, text };
  const { ask, description } = question;

  const embed = new EmbedBuilder()
    .setAuthor(author)
    .setColor(Color.Informational)
    .setFields(fields)
    .setFooter(footer)
    .setTimestamp(new Date())
    .setTitle(ask);

  return [description === "" ? embed : embed.setDescription(description)];
};

export const question = (context: Context, member: GuildMember) => ({
  components: questionComponents(context),
  embeds: questionEmbeds(context, member),
  ephemeral: true,
});
// endregion

// region Choice Modal
const choiceLabelInput = (context: Context) => {
  const { label } = withContext.getChoice(context);

  return new TextInputBuilder()
    .setCustomId(UIID.ChoiceLabelInput)
    .setLabel("Choice Label")
    .setMaxLength(100)
    .setStyle(TextInputStyle.Short)
    .setValue(label);
};

const choiceDescription = (context: Context) => {
  const { description } = withContext.getChoice(context);
  const placeholder =
    "Optional | Use this to explain the meaning of this choice.";

  return new TextInputBuilder()
    .setCustomId(UIID.ChoiceDescriptionInput)
    .setLabel("Choice Description")
    .setMaxLength(100)
    .setPlaceholder(placeholder)
    .setRequired(false)
    .setStyle(TextInputStyle.Short)
    .setValue(description);
};

const choiceLabelActionRow = (context: Context) =>
  new ActionRowBuilder<TextInputBuilder>().setComponents(
    choiceLabelInput(context),
  );

const choiceDescriptionActionRow = (context: Context) =>
  new ActionRowBuilder<TextInputBuilder>().setComponents(
    choiceDescription(context),
  );

export const choiceModal = (context: Context) =>
  new ModalBuilder()
    .setComponents(
      choiceLabelActionRow(context),
      choiceDescriptionActionRow(context),
    )
    .setCustomId(`${UIID.ChoiceModal}${context.sessionId}`)
    .setTitle(`Choice #${context.selectedChoiceIndex + 1}`);
// endregion

// region Choice Settings Modal
const choiceMinValuesInput = (context: Context) => {
  const { minValues } = withContext.getQuestion(context, isMultipleChoice);
  const placeholder = "How many choices must survey takers select?";

  return new TextInputBuilder()
    .setCustomId(UIID.ChoiceMinValuesInput)
    .setLabel("Minimum Choices to Select (1 - 25)")
    .setMaxLength(2)
    .setPlaceholder(placeholder)
    .setRequired(true)
    .setStyle(TextInputStyle.Short)
    .setValue(`${minValues}`);
};

const choiceMaxValuesInput = (context: Context) => {
  const { maxValues } = withContext.getQuestion(context, isMultipleChoice);
  const placeholder = "How many choices are survey takers allowed to select?";

  return new TextInputBuilder()
    .setCustomId(UIID.ChoiceMaxValuesInput)
    .setLabel("Maximum Choices to Select (1 - 25)")
    .setMaxLength(2)
    .setPlaceholder(placeholder)
    .setRequired(true)
    .setStyle(TextInputStyle.Short)
    .setValue(`${maxValues}`);
};

const choiceMinValuesActionRow = (context: Context) =>
  new ActionRowBuilder<TextInputBuilder>().setComponents(
    choiceMinValuesInput(context),
  );

const choiceMaxValuesActionRow = (context: Context) =>
  new ActionRowBuilder<TextInputBuilder>().setComponents(
    choiceMaxValuesInput(context),
  );

export const choiceSettingsModal = (context: Context) =>
  new ModalBuilder()
    .setComponents(
      choiceMinValuesActionRow(context),
      choiceMaxValuesActionRow(context),
    )
    .setCustomId(`${UIID.ChoiceSettingsModal}${context.sessionId}`)
    .setTitle("Multiple Choice Settings");
// endregion

// region Cancelled
const cancelledEmbeds = ({ survey }: Context) => {
  const description = `Successfully cancelled creating ${bold(survey.title)}!`;

  const embed = new EmbedBuilder()
    .setColor(Color.Warning)
    .setDescription(description);

  return [embed];
};

export const cancelled = (context: Context) => ({
  components: [],
  content: "",
  embeds: cancelledEmbeds(context),
});
// endregion

// region Create Survey Modal
const createSurveyDescriptionInput = () => {
  const placeholder =
    "Optional | Describe your survey or make a first impression with survey takers.";

  return new TextInputBuilder()
    .setCustomId(UIID.CreateSurveyDescriptionInput)
    .setLabel("Description")
    .setMaxLength(4000)
    .setPlaceholder(placeholder)
    .setRequired(false)
    .setStyle(TextInputStyle.Paragraph);
};

const createSurveyDescriptionActionRow = () =>
  new ActionRowBuilder<TextInputBuilder>().setComponents(
    createSurveyDescriptionInput(),
  );

export const createSurveyModal = ({ sessionId }: Context) =>
  new ModalBuilder()
    .setComponents(createSurveyDescriptionActionRow())
    .setCustomId(`${UIID.CreateSurveyModal}${sessionId}`)
    .setTitle("Create Survey");
// endregion
