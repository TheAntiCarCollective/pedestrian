import { registerComponent } from "../../../../services/discord";

import * as ui from "./index";
import { UIID } from "./constants";
import session from "../context";

registerComponent(UIID.NextButton, async (interaction, sessionId) => {
  const oldContext = await session.read(sessionId);
  oldContext.page += 1;

  const context = await session.update(oldContext, interaction);
  return interaction.update(ui.youtubeChannel(context));
});
