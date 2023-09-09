import assert from "node:assert";

import { registerComponent } from "../../../../services/discord";
import * as session from "../../../../session";

import ComponentId from "./index";
import type Context from "../context";
import * as ui from "../ui";

registerComponent(ComponentId.ChannelSelect, async (interaction, sessionId) => {
  assert(interaction.isChannelSelectMenu());
  const { channels } = interaction;

  const oldContext = await session.read<Context>(sessionId);
  oldContext.selectedChannelIds = [...channels.keys()];

  const context = await session.update(oldContext, interaction);
  return interaction.update(ui.youtubeChannel(context));
});
