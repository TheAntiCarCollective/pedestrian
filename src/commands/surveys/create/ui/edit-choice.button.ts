import { registerComponent } from "../../../../services/discord";

import * as ui from "./index";
import { UIID } from "./constants";
import session from "../context";

registerComponent(UIID.EditChoiceButton, async (interaction, sessionId) => {
  const context = await session.read(sessionId);
  await interaction.showModal(ui.choiceModal(context));
  return undefined;
});
