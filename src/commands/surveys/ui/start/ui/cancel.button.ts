import { registerComponent } from "../../../../../services/discord";
import session from "../context";
import UI, { UIID } from "../ui";

registerComponent(UIID.CancelButton, async (interaction, sessionId) => {
  const context = await session.read(sessionId);
  const response = await interaction.update(UI.cancelled(context));
  await session.destroy(sessionId);
  return response;
});
