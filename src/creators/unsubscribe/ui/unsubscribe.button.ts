import { registerComponent } from "../../../services/discord";

import * as ui from "./index";
import { UIID } from "./constants";
import session from "../context";
import * as database from "../database";

registerComponent(UIID.UnsubscribeButton, async (interaction, sessionId) => {
  const context = await session.read(sessionId);
  const { creatorType, creatorSubscriptions, selectedIndexes } = context;

  const obsoleteCreatorSubscriptions = creatorSubscriptions
    // prettier-ignore
    .filter((_, index) => selectedIndexes.includes(index));

  await database.deleteCreatorSubscriptions(
    creatorType,
    obsoleteCreatorSubscriptions,
  );

  const response = await interaction.update(ui.unsubscribed(context));
  await session.destroy(sessionId);
  return response;
});
