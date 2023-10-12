import { registerComponent } from "../../../../shared/discord";
import { InitialChoice } from "../../constants";
import session, * as withContext from "../context";
import UI, { UIID } from "../ui";

registerComponent(UIID.AddChoiceButton, async (interaction, sessionId) => {
  const oldContext = await session.read(sessionId);
  const choices = withContext.getChoices(oldContext);

  oldContext.selectedChoiceIndex =
    choices.length === 0 ? 0 : oldContext.selectedChoiceIndex + 1;
  choices[oldContext.selectedChoiceIndex] = InitialChoice;

  const context = await session.update(oldContext, interaction);
  await interaction.showModal(UI.choiceModal(context));
});
