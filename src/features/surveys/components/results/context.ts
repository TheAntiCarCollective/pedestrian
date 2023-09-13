import type {
  BaseMessageOptions,
  MessageComponentInteraction,
  ModalMessageModalSubmitInteraction,
} from "discord.js";
import { AttachmentBuilder } from "discord.js";
import type { Canvas } from "canvas";
import type { Spec } from "vega";
import { View, parse } from "vega";
import { produce } from "immer";
import assert from "node:assert";

import * as ui from "./ui";
import initialAnswersJson from "./answers.json";
import type { Answer, Survey } from "../../types";
import { isMultipleChoice, isSelected, surveyCreator } from "../../functions";

// region Types
type Context = {
  sessionId: string;
  survey: Survey;
  results: Answer[][];
  selectedQuestionIndex: number;
  selectedAnswerIndex: number;
};

type Interaction =
  | MessageComponentInteraction
  | ModalMessageModalSubmitInteraction;
// endregion

export const getQuestions = ({ survey }: Context) => survey.questions;

export const getQuestion = (context: Context) => {
  const questions = getQuestions(context);
  const question = questions[context.selectedQuestionIndex];
  assert(question !== undefined);
  return question;
};

export const getAnswers = (context: Context) => {
  const answers = context.results[context.selectedQuestionIndex];
  assert(answers !== undefined);
  return answers;
};

export const getAnswer = (context: Context) => {
  const answers = getAnswers(context);
  const answer = answers[context.selectedAnswerIndex];
  assert(answer !== undefined);
  return answer;
};

export const getAnswersPng = async (context: Context) => {
  const question = getQuestion(context);
  if (!isMultipleChoice(question)) return undefined;

  const { choices } = question;
  const values = choices.map(({ label }) => ({
    choice: label,
    selections: 0,
  }));

  const answers = getAnswers(context);
  for (const answer of answers) {
    if (isSelected(answer)) {
      for (const selectedIndex of answer) {
        const value = values[selectedIndex];
        assert(value !== undefined);
        value.selections += 1;
      }
    }
  }

  const answersJson = produce(initialAnswersJson, (draft) => {
    draft.height = choices.length * 32;

    const { title } = draft;
    title.text = question.ask;

    const table = draft.data[0];
    assert(table !== undefined);
    table.values = values;
  });

  // https://vega.github.io/vega/docs/data
  // https://immerjs.github.io/immer/freezing
  // https://github.com/vega/vega/issues/2125
  // Deep copy answersJson using JSON functions as a workaround
  const answersJsonString = JSON.stringify(answersJson);
  const spec = JSON.parse(answersJsonString) as Spec;

  const runtime = parse(spec);
  const view = new View(runtime, {
    renderer: "none",
  });

  // @ts-expect-error https://vega.github.io/vega/docs/api/view/#view_toCanvas
  const canvas: Canvas = await view.toCanvas();
  const stream = canvas.createPNGStream();

  return new AttachmentBuilder(stream, {
    name: "answers.png",
  });
};

export const resultsUi = async (
  context: Context,
  interaction: Interaction,
  files: BaseMessageOptions["files"] = [],
) => {
  const { survey } = context;
  const { message } = interaction;

  const creator = await surveyCreator(survey, interaction);
  const answersPng = await getAnswersPng(context);
  if (answersPng !== undefined) files.push(answersPng);

  return survey.id === message.id
    ? interaction.reply(ui.results(context, creator, files))
    : interaction.update(ui.results(context, creator, files));
};

export default Context;
