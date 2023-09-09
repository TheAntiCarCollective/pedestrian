import { registerComponent } from "../../../../services/discord";
import * as session from "../../../../session";

import ComponentId from "./index";
import * as ui from "../ui";

registerComponent(ComponentId.CancelButton, async (interaction, sessionId) => {
  await session.destroy(sessionId);
  return interaction.update(ui.cancelled());
});
