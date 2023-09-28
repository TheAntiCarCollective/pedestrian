import { registerComponent } from "../../../../services/discord";

import UI, { UIID } from "../ui";
import session from "../context";

registerComponent(
  UIID.EditChoiceSettingsButton,
  async (interaction, sessionId) => {
    const context = await session.read(sessionId);
    await interaction.showModal(UI.choiceSettingsModal(context));
    return undefined;
  },
);
