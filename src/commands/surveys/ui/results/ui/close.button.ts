import { registerComponent } from "../../../../../services/discord";
import session from "../context";
import { UIID } from "../ui";

registerComponent(UIID.CloseButton, async (interaction, sessionId) => {
  const response = await interaction.deferUpdate();
  await response.delete();
  await session.destroy(sessionId);
  return response;
});
