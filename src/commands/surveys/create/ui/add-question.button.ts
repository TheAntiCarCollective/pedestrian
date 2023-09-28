import { registerComponent } from "../../../../services/discord";

import UI, { UIID } from "../ui";
import session, * as withContext from "../context";
import { InitialQuestion } from "../../constants";

registerComponent(UIID.AddQuestionButton, async (interaction, sessionId) => {
  const oldContext = await session.read(sessionId);
  const questions = withContext.getQuestions(oldContext);

  oldContext.selectedQuestionIndex += 1;
  questions[oldContext.selectedQuestionIndex] = InitialQuestion;

  const context = await session.update(oldContext, interaction);
  await interaction.showModal(UI.questionModal(context));
  return undefined;
});
