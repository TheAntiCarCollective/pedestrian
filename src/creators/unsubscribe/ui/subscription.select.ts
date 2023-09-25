import assert from "node:assert";

import { registerComponent } from "../../../services/discord";

import * as ui from "./index";
import { UIID } from "./constants";
import session from "../context";

registerComponent(UIID.SubscriptionSelect, async (interaction, sessionId) => {
  assert(interaction.isStringSelectMenu());
  const { guild, values } = interaction;

  assert(guild !== null);
  const { channels } = guild;

  const oldContext = await session.read(sessionId);
  oldContext.selectedIndexes = values.map((value) => Number.parseInt(value));

  const context = await session.update(oldContext, interaction);
  return interaction.update(ui.unsubscribeMenu(context, channels));
});
