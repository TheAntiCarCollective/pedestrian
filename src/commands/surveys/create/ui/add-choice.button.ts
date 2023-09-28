import { registerComponent } from "../../../../services/discord";

import UI, { UIID } from "../ui";
import session, * as withContext from "../context";
import { InitialChoice } from "../../constants";

registerComponent(UIID.AddChoiceButton, async (interaction, sessionId) => {
  const oldContext = await session.read(sessionId);
  const choices = withContext.getChoices(oldContext);

  oldContext.selectedChoiceIndex =
    choices.length === 0 ? 0 : oldContext.selectedChoiceIndex + 1;
  choices[oldContext.selectedChoiceIndex] = InitialChoice;

  const context = await session.update(oldContext, interaction);
  await interaction.showModal(UI.choiceModal(context));
  return undefined;
});
