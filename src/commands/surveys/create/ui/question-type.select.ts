import assert, { fail as error } from "node:assert";

import { registerComponent } from "../../../../services/discord";
import {
  InitialMultipleChoiceQuestion,
  InitialOpenAnswerQuestion,
  QuestionType,
} from "../../constants";
import session, * as withContext from "../context";
import { UIID } from "../ui";

registerComponent(UIID.QuestionTypeSelect, async (interaction, sessionId) => {
  assert(interaction.isStringSelectMenu());
  const value = interaction.values[0];

  const oldContext = await session.read(sessionId);
  const questions = withContext.getQuestions(oldContext);
  const { ask, description, type } = withContext.getQuestion(oldContext);
  const { selectedQuestionIndex } = oldContext;

  let newQuestion;
  switch (value) {
    case type: {
      return withContext.questionUi(oldContext, interaction);
    }
    case QuestionType.MultipleChoice: {
      newQuestion = {
        ...InitialMultipleChoiceQuestion,
        ask,
        description,
      };

      break;
    }
    case QuestionType.OpenAnswer: {
      newQuestion = {
        ...InitialOpenAnswerQuestion,
        ask,
        description,
      };

      break;
    }
    default: {
      error();
    }
  }

  oldContext.selectedChoiceIndex = 0;
  questions[selectedQuestionIndex] = newQuestion;

  const context = await session.update(oldContext, interaction);
  return withContext.questionUi(context, interaction);
});
