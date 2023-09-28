import { registerComponent } from "../../../../services/discord";

import UI, { UIID } from "../ui";
import session from "../context";

registerComponent(UIID.EditChoiceButton, async (interaction, sessionId) => {
  const context = await session.read(sessionId);
  await interaction.showModal(UI.choiceModal(context));
  return undefined;
});
