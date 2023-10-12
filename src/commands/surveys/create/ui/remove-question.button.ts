import { registerComponent } from "../../../../shared/discord";
import session, * as withContext from "../context";
import { UIID } from "../ui";

registerComponent(UIID.RemoveQuestionButton, async (interaction, sessionId) => {
  const oldContext = await session.read(sessionId);
  const questions = withContext.getQuestions(oldContext);

  const { selectedQuestionIndex } = oldContext;
  questions.splice(selectedQuestionIndex, 1);
  oldContext.selectedQuestionIndex = Math.max(selectedQuestionIndex - 1, 0);
  oldContext.selectedChoiceIndex = 0;

  const context = await session.update(oldContext, interaction);
  return withContext.questionUi(context, interaction);
});
