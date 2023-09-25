import { registerComponent } from "../../../../../services/discord";

import { UIID } from "./constants";
import session from "../context";

registerComponent(UIID.CloseButton, async (interaction, sessionId) => {
  const response = await interaction.deferUpdate();
  await response.delete();
  await session.destroy(sessionId);
  return response;
});
