import { registerComponent } from "../../../shared/discord";
import session, * as withContext from "../context";
import { UIID } from "../ui";

registerComponent(UIID.SwapButton, async (interaction, sessionId) => {
  const context = await session.read(sessionId);

  const { firstCar, secondCar } = context;
  context.firstCar = secondCar;
  context.secondCar = firstCar;

  const newContext = await session.update(context, interaction);
  return withContext.compareCarsUi(newContext, interaction);
});
