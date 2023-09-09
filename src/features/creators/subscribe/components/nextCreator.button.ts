import { registerComponent } from "../../../../services/discord";
import * as session from "../../../../session";

import ComponentId from "./index";
import type Context from "../context";
import * as ui from "../ui";

registerComponent(
  ComponentId.NextCreatorButton,
  async (interaction, sessionId) => {
    const oldContext = await session.read<Context>(sessionId);
    oldContext.page += 1;

    const context = await session.update(oldContext, interaction);
    return interaction.update(ui.youtubeChannel(context));
  },
);
