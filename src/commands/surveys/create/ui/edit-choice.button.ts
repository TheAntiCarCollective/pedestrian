import { registerComponent } from "../../../../shared/discord";
import session from "../context";
import UI, { UIID } from "../ui";

registerComponent(UIID.EditChoiceButton, async (interaction, sessionId) => {
  const context = await session.read(sessionId);
  await interaction.showModal(UI.choiceModal(context));
});
