import { registerComponent } from "../../../../../services/discord";
import * as session from "../../../../../session";

import ComponentId from "./index";
import type Context from "../context";
import * as withContext from "../context";

registerComponent(
  ComponentId.NextQuestionButton,
  async (interaction, sessionId) => {
    const oldContext = await session.read<Context>(sessionId);
    oldContext.selectedIndex += 1;

    const context = await session.update(oldContext, interaction);
    return withContext.answerUi(context, interaction);
  },
);
