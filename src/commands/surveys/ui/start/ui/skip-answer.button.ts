import { registerComponent } from "../../../../../services/discord";

import { UIID } from "../ui";
import session, * as withContext from "../context";

registerComponent(UIID.SkipAnswerButton, async (interaction, sessionId) => {
  const oldContext = await session.read(sessionId);
  oldContext.answers[oldContext.selectedIndex] = null;

  const context = await session.update(oldContext, interaction);
  return withContext.answerUi(context, interaction);
});
