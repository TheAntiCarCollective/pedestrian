import { registerComponent } from "../../../../../shared/discord";
import session, * as withContext from "../context";
import { UIID } from "../ui";

registerComponent(UIID.NextQuestionButton, async (interaction, sessionId) => {
  const oldContext = await session.read(sessionId);
  oldContext.selectedIndex += 1;

  const context = await session.update(oldContext, interaction);
  return withContext.answerUi(context, interaction);
});
