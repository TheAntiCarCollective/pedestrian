import { registerComponent } from "../../../../../services/discord";
import * as session from "../../../../../session";

import ComponentId from "./index";
import type Context from "../context";
import * as ui from "../ui";

registerComponent(ComponentId.CancelButton, async (interaction, sessionId) => {
  const context = await session.read<Context>(sessionId);
  const response = await interaction.update(ui.cancelled(context));
  await session.destroy(sessionId);
  return response;
});
