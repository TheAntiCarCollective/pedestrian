import type {
  MessageComponentInteraction,
  ModalSubmitInteraction,
} from "discord.js";
import { GuildMember } from "discord.js";
import assert from "node:assert";

import type { Question, Survey } from "../types";
import { QuestionType } from "../constants";
import { isMultipleChoice } from "../functions";
import * as ui from "./ui";

// region Types
type Context = {
  sessionId: string;
  survey: Omit<Survey, "id">;
  selectedQuestionIndex: number;
  selectedChoiceIndex: number;
};

type GetQuestion = {
  (context: Context): Question;
  <T extends Question>(
    context: Context,
    checker: (question: Question) => question is T,
  ): T;
};

type Interaction = MessageComponentInteraction | ModalSubmitInteraction;
// endregion

export const getQuestions = ({ survey }: Context) => survey.questions;

export const getQuestion: GetQuestion = <T extends Question>(
  context: Context,
  checker?: (question: Question) => question is T,
) => {
  const questions = getQuestions(context);
  const question = questions[context.selectedQuestionIndex];
  assert(question !== undefined);

  if (checker === undefined) return question;
  assert(checker(question));
  return question;
};

export const getChoices = (context: Context) => {
  const { choices } = getQuestion(context, isMultipleChoice);
  return choices;
};

export const getChoice = (context: Context) => {
  const choices = getChoices(context);
  const choice = choices[context.selectedChoiceIndex];
  assert(choice !== undefined);
  return choice;
};

export const isQuestionValid = (context: Context) => {
  const question = getQuestion(context);
  switch (question.type) {
    case QuestionType.MultipleChoice: {
      const { choices } = question;
      return choices.length > 0;
    }
    case QuestionType.OpenAnswer:
      return true;
  }
};

export const questionUi = (context: Context, interaction: Interaction) => {
  const { member } = interaction;
  assert(member instanceof GuildMember);

  return !interaction.isModalSubmit() || interaction.isFromMessage()
    ? interaction.update(ui.question(context, member))
    : interaction.reply(ui.question(context, member));
};

export default Context;
