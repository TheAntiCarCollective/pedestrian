import { registerComponent } from "../../../../../services/discord";
import * as session from "../../../../../session";

import ComponentId from "./index";
import type Context from "../context";
import * as withContext from "../context";

registerComponent(
  ComponentId.SkipAnswerButton,
  async (interaction, sessionId) => {
    const oldContext = await session.read<Context>(sessionId);
    oldContext.answers[oldContext.selectedIndex] = null;

    const context = await session.update(oldContext, interaction);
    return withContext.answerUi(context, interaction);
  },
);
