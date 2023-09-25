import { registerComponent } from "../../../../../services/discord";

import { UIID } from "./constants";
import session, * as withContext from "../context";

registerComponent(UIID.PreviousAnswerButton, async (interaction, sessionId) => {
  const oldContext = await session.read(sessionId);
  oldContext.selectedAnswerIndex -= 1;

  const context = await session.update(oldContext, interaction);
  return withContext.resultsUi(context, interaction);
});
