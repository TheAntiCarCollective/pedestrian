import { registerComponent } from "../../../../services/discord";

import * as ui from "./index";
import { UIID } from "./constants";
import session from "../context";

registerComponent(
  UIID.EditChoiceSettingsButton,
  async (interaction, sessionId) => {
    const context = await session.read(sessionId);
    await interaction.showModal(ui.choiceSettingsModal(context));
    return undefined;
  },
);
