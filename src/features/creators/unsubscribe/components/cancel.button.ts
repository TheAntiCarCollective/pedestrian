import { registerComponent } from "../../../../services/discord";
import * as session from "../../../../session";

import ComponentId from "./index";
import * as ui from "../ui";

registerComponent(ComponentId.CancelButton, async (interaction, sessionId) => {
  const response = await interaction.update(ui.cancelled());
  await session.destroy(sessionId);
  return response;
});
