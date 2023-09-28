import { registerComponent } from "../../../../../services/discord";

import UI, { UIID } from "../ui";
import session from "../context";

registerComponent(UIID.AnswerButton, async (interaction, sessionId) => {
  const context = await session.read(sessionId);
  await interaction.showModal(UI.answerModal(context));
  return undefined;
});
