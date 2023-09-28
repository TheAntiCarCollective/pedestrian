import type {
  MessageComponentInteraction,
  ModalMessageModalSubmitInteraction,
} from "discord.js";
import assert from "node:assert";

import Session from "../../../../session";

import type { Answer, Question, Survey } from "../../types";
import { surveyCreator } from "../../functions";
import UI from "./ui";

// region Types
export type Context = {
  sessionId: string;
  survey: Survey;
  answers: Answer[];
  selectedIndex: number;
};

type GetQuestion = {
  (context: Context): Question;
  <T extends Question>(
    context: Context,
    checker: (question: Question) => question is T,
  ): T;
};

type Interaction =
  | MessageComponentInteraction
  | ModalMessageModalSubmitInteraction;
// endregion

export const getQuestions = ({ survey }: Context) => survey.questions;

export const getQuestion: GetQuestion = <T extends Question>(
  context: Context,
  checker?: (question: Question) => question is T,
) => {
  const questions = getQuestions(context);
  const question = questions[context.selectedIndex];
  assert(question !== undefined);

  if (checker === undefined) return question;
  assert(checker(question));
  return question;
};

export const answerUi = async (context: Context, interaction: Interaction) => {
  const { survey } = context;
  const { message } = interaction;

  const creator = await surveyCreator(survey, interaction);
  return survey.id === message.id
    ? interaction.reply(UI.answer(context, creator))
    : interaction.update(UI.answer(context, creator));
};

export default new Session<Context>();
