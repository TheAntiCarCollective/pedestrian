import { registerComponent } from "../../../../../services/discord";
import session, * as withContext from "../context";
import { UIID } from "../ui";

registerComponent(UIID.NextQuestionButton, async (interaction, sessionId) => {
  const oldContext = await session.read(sessionId);
  oldContext.selectedQuestionIndex += 1;
  oldContext.selectedAnswerIndex = 0;

  const context = await session.update(oldContext, interaction);
  return withContext.resultsUi(context, interaction);
});
