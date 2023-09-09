import assert from "node:assert";

import { registerComponent } from "../../../../services/discord";
import * as session from "../../../../session";

import ComponentId from "./index";
import type { Context } from "../types";
import * as ui from "../ui";
import { getChannels } from "../../function";

registerComponent(ComponentId.IndexSelect, async (interaction, sessionId) => {
  assert(interaction.isStringSelectMenu());
  const { guild, values } = interaction;

  assert(guild !== null);
  const { channels: guildChannelManager } = guild;

  const oldContext = await session.read<Context>(sessionId);
  oldContext.selectedIndexes = values.map((value) => parseInt(value));

  const context = await session.update(oldContext, interaction);
  const { creatorSubscriptions } = context;

  const channels = await getChannels(creatorSubscriptions, guildChannelManager);
  return interaction.update(ui.unsubscribeMenu(context, channels));
});
