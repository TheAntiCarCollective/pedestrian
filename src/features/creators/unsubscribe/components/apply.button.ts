import { registerComponent } from "../../../../services/discord";
import * as session from "../../../../session";

import ComponentId from "./index";
import type { Context } from "../types";
import * as ui from "../ui";
import * as database from "../database";

registerComponent(ComponentId.ApplyButton, async (interaction, sessionId) => {
  const context = await session.destroy<Context>(sessionId);
  const { creatorSubscriptions, selectedIndexes } = context;

  const creatorSubscriptionIds = creatorSubscriptions
    .filter((_, index) => selectedIndexes.includes(index))
    .map(({ id }) => id);

  await database.deleteCreatorSubscriptions(creatorSubscriptionIds);
  return interaction.update(ui.unsubscribed(context));
});
