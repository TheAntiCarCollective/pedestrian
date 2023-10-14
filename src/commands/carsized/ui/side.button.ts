import { registerComponent } from "../../../shared/discord";
import { Perspective } from "../constants";
import session, * as withContext from "../context";
import { UIID } from "../ui";

registerComponent(UIID.SideButton, async (interaction, sessionId) => {
  const context = await session.read(sessionId);
  context.perspective = Perspective.Side;

  const newContext = await session.update(context, interaction);
  return withContext.compareCarsUi(newContext, interaction);
});
