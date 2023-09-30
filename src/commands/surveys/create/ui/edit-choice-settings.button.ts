import { registerComponent } from "../../../../services/discord";
import session from "../context";
import UI, { UIID } from "../ui";

registerComponent(
  UIID.EditChoiceSettingsButton,
  async (interaction, sessionId) => {
    const context = await session.read(sessionId);
    await interaction.showModal(UI.choiceSettingsModal(context));
  },
);
