import { registerComponent } from "../../../services/discord";

import * as ui from "./index";
import { UIID } from "./constants";
import session from "../context";

registerComponent(UIID.CancelButton, async (interaction, sessionId) => {
  const response = await interaction.update(ui.cancelled());
  await session.destroy(sessionId);
  return response;
});
