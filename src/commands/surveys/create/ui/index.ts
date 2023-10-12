import type { GuildMember } from "discord.js";

import { compress } from "compress-tag";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
  bold,
  roleMention,
} from "discord.js";

import type { PartialSurvey } from "../../types";
import type { Context } from "../context";

import { Color } from "../../../../shared/discord";
import { QuestionType, QuestionTypes } from "../../constants";
import { isMultipleChoice, surveyLink } from "../../functions";
import UI from "../../ui";
import * as withContext from "../context";

export enum UIID {
  AddChoiceButton = "0d546ea3-9706-404e-92b3-9cd89c1253d4",
  AddQuestionButton = "e4546aa3-ccb4-438a-8a88-4957f5ed6c91",
  CancelButton = "d23e3ba0-b898-46af-bb9b-e152c8bcec88",
  ChoiceDescriptionInput = "CHOICE_DESCRIPTION_INPUT",
  ChoiceLabelInput = "CHOICE_LABEL_INPUT",
  ChoiceMaxValuesInput = "CHOICE_MAX_VALUES_INPUT",
  ChoiceMinValuesInput = "CHOICE_MIN_VALUES_INPUT",
  ChoiceModal = "7b71c134-6afa-4938-8569-e26a759d7d93",
  ChoiceSelect = "7630eb7c-93d2-4dba-b8e4-272d354c09ce",
  ChoiceSettingsModal = "47f03430-02e1-4a08-b568-30a51b8687e3",
  CreateButton = "d655ff28-265e-4bd5-8df1-5f3936099902",
  CreateSurveyDescriptionInput = "SURVEY_DESCRIPTION_INPUT",
  CreateSurveyModal = "6dd12403-af62-49b1-937e-6f26421ac407",
  EditChoiceButton = "7bb30714-2fc7-4fbb-a694-76f8fb68ffc7",
  EditChoiceSettingsButton = "80a24a63-e06c-46bb-938d-e536685ee807",
  EditQuestionButton = "b39d3502-6ea1-4ee7-a7d2-a1fcb029015e",
  NextQuestionButton = "32fce1fb-dea3-4478-a4d6-00d6b330c6d2",
  PreviousQuestionButton = "ad4d5923-5c42-4f08-a2ac-99a28430dd4c",
  QuestionAskInput = "QUESTION_ASK_INPUT",
  QuestionDescriptionInput = "QUESTION_DESCRIPTION_INPUT",
  QuestionModal = "d629d1f3-9446-4e09-b998-656bd43548bd",
  QuestionTypeSelect = "9aa38b21-5c50-4069-89f4-635e379b4e7b",
  RemoveChoiceButton = "ef8e3db3-a392-485f-a999-77fb74a06700",
  RemoveQuestionButton = "4775a6fc-1dba-4cd2-8a79-f6930f9b037e",
}

// region Permissions Denied
const permissionsDeniedEmbeds = (surveyCreatorRoleId: null | string) => {
  // prettier-ignore
  const orRole = surveyCreatorRoleId === null ? " " : ` or ${roleMention(surveyCreatorRoleId)} `;
  const description = `You must have Manage Messages permissions${orRole}to create surveys.`;

  const embed = new EmbedBuilder()
    .setColor(Color.Error)
    .setDescription(description);

  return [embed];
};

const permissionsDenied = (surveyCreatorRoleId: null | string) => ({
  embeds: permissionsDeniedEmbeds(surveyCreatorRoleId),
  ephemeral: true,
});
// endregion

// region Survey Exists
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

const surveyExists = (survey: PartialSurvey) => ({
  components: UI.surveyLinkComponents(survey),
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

const questionModal = (context: Context) => {
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
  const options = choices.map(({ description, label }, index) => {
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
    const { maxValues, minValues } = question;

    fields.push(
      {
        inline: true,
        name: "Minimum Choices to Select",
        value: `${minValues}`,
      },
      {
        inline: true,
        name: "Maximum Choices to Select",
        value: `${maxValues}`,
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

const question = (context: Context, member: GuildMember) => ({
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

const choiceModal = (context: Context) =>
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

const choiceSettingsModal = (context: Context) =>
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

const cancelled = (context: Context) => ({
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

const createSurveyModal = ({ sessionId }: Context) =>
  new ModalBuilder()
    .setComponents(createSurveyDescriptionActionRow())
    .setCustomId(`${UIID.CreateSurveyModal}${sessionId}`)
    .setTitle("Create Survey");
// endregion

export default {
  cancelled,
  choiceModal,
  choiceSettingsModal,
  createSurveyModal,
  permissionsDenied,
  question,
  questionModal,
  surveyExists,
};
