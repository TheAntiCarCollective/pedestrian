import { registerComponent } from "../../../../services/discord";
import * as session from "../../../../session";

import ComponentId from "./index";
import type Context from "../context";
import * as ui from "../ui";

registerComponent(
  ComponentId.EditChoiceButton,
  async (interaction, sessionId) => {
    const context = await session.read<Context>(sessionId);
    await interaction.showModal(ui.choiceModal(context));
    return undefined;
  },
);
