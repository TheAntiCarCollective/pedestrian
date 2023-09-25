import { registerComponent } from "../../../../../services/discord";

import * as ui from "./index";
import { UIID } from "./constants";
import session from "../context";

registerComponent(UIID.AnswerButton, async (interaction, sessionId) => {
  const context = await session.read(sessionId);
  await interaction.showModal(ui.answerModal(context));
  return undefined;
});
