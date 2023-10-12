import { registerComponent } from "../../../../../shared/discord";
import session, * as withContext from "../context";
import { UIID } from "../ui";

registerComponent(UIID.SkipAnswerButton, async (interaction, sessionId) => {
  const oldContext = await session.read(sessionId);
  oldContext.answers[oldContext.selectedIndex] = null;

  const context = await session.update(oldContext, interaction);
  return withContext.answerUi(context, interaction);
});
