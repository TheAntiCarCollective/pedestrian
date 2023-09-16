import { registerComponent } from "../../../../services/discord";
import * as session from "../../../../session";

import ComponentId from "./index";
import type { Context } from "../types";
import * as ui from "../ui";
import * as database from "../database";

registerComponent(ComponentId.ApplyButton, async (interaction, sessionId) => {
  const context = await session.read<Context>(sessionId);
  const { creatorSubscriptions, selectedIndexes } = context;

  const creatorSubscriptionIds = creatorSubscriptions
    .filter((_, index) => selectedIndexes.includes(index))
    .map(({ id }) => id);

  await database.deleteCreatorSubscriptions(creatorSubscriptionIds);

  const response = await interaction.update(ui.unsubscribed(context));
  await session.destroy(sessionId);
  return response;
});
