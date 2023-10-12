import assert from "node:assert";

import { registerComponent } from "../../../shared/discord";
import session from "../context";
import UI, { UIID } from "../ui";

registerComponent(UIID.SubscriptionSelect, async (interaction, sessionId) => {
  assert(interaction.isStringSelectMenu());
  const { guild, values } = interaction;

  assert(guild !== null);
  const { channels } = guild;

  const oldContext = await session.read(sessionId);
  oldContext.selectedIndexes = values.map((value) => Number.parseInt(value));

  const context = await session.update(oldContext, interaction);
  return interaction.update(UI.unsubscribeMenu(context, channels));
});
