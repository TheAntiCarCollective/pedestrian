import { registerComponent } from "../../../services/discord";
import { Units } from "../constants";
import session, * as withContext from "../context";
import { UIID } from "../ui";

registerComponent(UIID.MetricButton, async (interaction, sessionId) => {
  const context = await session.read(sessionId);
  context.units = Units.Metric;

  const newContext = await session.update(context, interaction);
  return withContext.compareCarsUi(newContext, interaction);
});
