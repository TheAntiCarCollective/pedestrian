import assert, { fail as error } from "node:assert";

import { registerComponent } from "../../../../services/discord";
import * as session from "../../../../session";

import ComponentId from "./index";
import type Context from "../context";
import * as withContext from "../context";
import type { Question } from "../../types";
import {
  InitialMultipleChoiceQuestion,
  InitialOpenAnswerQuestion,
  QuestionType,
} from "../../constants";

registerComponent(
  ComponentId.QuestionTypeSelect,
  async (interaction, sessionId) => {
    assert(interaction.isStringSelectMenu());
    const value = interaction.values[0];

    const oldContext = await session.read<Context>(sessionId);
    const questions = withContext.getQuestions(oldContext);
    const { type, ask, description } = withContext.getQuestion(oldContext);
    const { selectedQuestionIndex } = oldContext;

    let newQuestion: Question;
    switch (value) {
      case type:
        return withContext.questionUi(oldContext, interaction);
      case QuestionType.MultipleChoice:
        newQuestion = {
          ...InitialMultipleChoiceQuestion,
          ask,
          description,
        };

        break;
      case QuestionType.OpenAnswer:
        newQuestion = {
          ...InitialOpenAnswerQuestion,
          ask,
          description,
        };

        break;
      default:
        error();
    }

    oldContext.selectedChoiceIndex = 0;
    questions[selectedQuestionIndex] = newQuestion;

    const context = await session.update(oldContext, interaction);
    return withContext.questionUi(context, interaction);
  },
);
