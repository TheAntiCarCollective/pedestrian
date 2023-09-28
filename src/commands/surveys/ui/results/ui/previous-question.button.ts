import { registerComponent } from "../../../../../services/discord";

import { UIID } from "../ui";
import session, * as withContext from "../context";

registerComponent(
  UIID.PreviousQuestionButton,
  async (interaction, sessionId) => {
    const oldContext = await session.read(sessionId);
    oldContext.selectedQuestionIndex -= 1;
    oldContext.selectedAnswerIndex = 0;

    const context = await session.update(oldContext, interaction);
    return withContext.resultsUi(context, interaction);
  },
);
