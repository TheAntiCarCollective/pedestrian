import { registerComponent } from "../../../services/discord";
import { Prospective } from "../constants";
import session, * as withContext from "../context";
import { UIID } from "../ui";

registerComponent(UIID.RearButton, async (interaction, sessionId) => {
  const context = await session.read(sessionId);
  context.prospective = Prospective.Rear;

  const newContext = await session.update(context, interaction);
  return withContext.compareCarsUi(newContext, interaction);
});
