import { registerComponent } from "../../../../../services/discord";

import UI, { UIID } from "../ui";
import session from "../context";

registerComponent(UIID.CancelButton, async (interaction, sessionId) => {
  const context = await session.read(sessionId);
  const response = await interaction.update(UI.cancelled(context));
  await session.destroy(sessionId);
  return response;
});
