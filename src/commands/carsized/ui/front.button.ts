import { registerComponent } from "../../../shared/discord";
import { Prospective } from "../constants";
import session, * as withContext from "../context";
import { UIID } from "../ui";

registerComponent(UIID.FrontButton, async (interaction, sessionId) => {
  const context = await session.read(sessionId);
  context.prospective = Prospective.Front;

  const newContext = await session.update(context, interaction);
  return withContext.compareCarsUi(newContext, interaction);
});
