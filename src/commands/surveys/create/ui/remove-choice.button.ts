import { registerComponent } from "../../../../shared/discord";
import session, * as withContext from "../context";
import { UIID } from "../ui";

registerComponent(UIID.RemoveChoiceButton, async (interaction, sessionId) => {
  const oldContext = await session.read(sessionId);
  const choices = withContext.getChoices(oldContext);

  const { selectedChoiceIndex } = oldContext;
  choices.splice(selectedChoiceIndex, 1);
  oldContext.selectedChoiceIndex = Math.max(selectedChoiceIndex - 1, 0);

  const context = await session.update(oldContext, interaction);
  return withContext.questionUi(context, interaction);
});
