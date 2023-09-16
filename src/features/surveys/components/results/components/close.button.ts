import { registerComponent } from "../../../../../services/discord";
import * as session from "../../../../../session";

import ComponentId from "./index";

registerComponent(ComponentId.CloseButton, async (interaction, sessionId) => {
  const response = await interaction.deferUpdate();
  await response.delete();
  await session.destroy(sessionId);
  return response;
});
