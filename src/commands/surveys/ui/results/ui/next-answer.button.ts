import { registerComponent } from "../../../../../shared/discord";
import session, * as withContext from "../context";
import { UIID } from "../ui";

registerComponent(UIID.NextAnswerButton, async (interaction, sessionId) => {
  const oldContext = await session.read(sessionId);
  oldContext.selectedAnswerIndex += 1;

  const context = await session.update(oldContext, interaction);
  return withContext.resultsUi(context, interaction);
});
