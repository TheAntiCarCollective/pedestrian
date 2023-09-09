import { registerComponent } from "../../../../services/discord";
import * as session from "../../../../session";

import ComponentId from "./index";
import type Context from "../context";
import * as withContext from "../context";

registerComponent(
  ComponentId.RemoveQuestionButton,
  async (interaction, sessionId) => {
    const oldContext = await session.read<Context>(sessionId);
    const questions = withContext.getQuestions(oldContext);

    const { selectedQuestionIndex } = oldContext;
    questions.splice(selectedQuestionIndex, 1);
    oldContext.selectedQuestionIndex = Math.max(selectedQuestionIndex - 1, 0);
    oldContext.selectedChoiceIndex = 0;

    const context = await session.update(oldContext, interaction);
    return withContext.questionUi(context, interaction);
  },
);
