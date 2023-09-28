import assert from "node:assert";

import { registerComponent } from "../../../services/discord";

import UI, { UIID } from "../ui";
import session from "../context";

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
