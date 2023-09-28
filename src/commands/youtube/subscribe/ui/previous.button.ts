import { registerComponent } from "../../../../services/discord";

import UI, { UIID } from "../ui";
import session from "../context";

registerComponent(UIID.PreviousButton, async (interaction, sessionId) => {
  const oldContext = await session.read(sessionId);
  oldContext.page -= 1;

  const context = await session.update(oldContext, interaction);
  return interaction.update(UI.youtubeChannel(context));
});
