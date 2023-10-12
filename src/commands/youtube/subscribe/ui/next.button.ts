import { registerComponent } from "../../../../shared/discord";
import session from "../context";
import UI, { UIID } from "../ui";

registerComponent(UIID.NextButton, async (interaction, sessionId) => {
  const oldContext = await session.read(sessionId);
  oldContext.page += 1;

  const context = await session.update(oldContext, interaction);
  return interaction.update(UI.youtubeChannel(context));
});
