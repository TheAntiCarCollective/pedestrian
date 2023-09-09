import { registerComponent } from "../../../../services/discord";
import * as session from "../../../../session";

import ComponentId from "./index";
import type Context from "../context";
import * as withContext from "../context";
import * as ui from "../ui";
import { InitialQuestion } from "../../constants";

registerComponent(
  ComponentId.AddQuestionButton,
  async (interaction, sessionId) => {
    const oldContext = await session.read<Context>(sessionId);
    const questions = withContext.getQuestions(oldContext);

    oldContext.selectedQuestionIndex += 1;
    questions[oldContext.selectedQuestionIndex] = InitialQuestion;

    const context = await session.update(oldContext, interaction);
    await interaction.showModal(ui.questionModal(context));
    return undefined;
  },
);
