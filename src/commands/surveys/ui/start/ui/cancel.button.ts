import { registerComponent } from "../../../../../services/discord";

import * as ui from "./index";
import { UIID } from "./constants";
import session from "../context";

registerComponent(UIID.CancelButton, async (interaction, sessionId) => {
  const context = await session.read(sessionId);
  const response = await interaction.update(ui.cancelled(context));
  await session.destroy(sessionId);
  return response;
});
