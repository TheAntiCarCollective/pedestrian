import { registerComponent } from "../../../../services/discord";
import * as session from "../../../../session";

import ComponentId from "./index";
import type Context from "../context";
import * as withContext from "../context";

registerComponent(
  ComponentId.RemoveChoiceButton,
  async (interaction, sessionId) => {
    const oldContext = await session.read<Context>(sessionId);
    const choices = withContext.getChoices(oldContext);

    const { selectedChoiceIndex } = oldContext;
    choices.splice(selectedChoiceIndex, 1);
    oldContext.selectedChoiceIndex = Math.max(selectedChoiceIndex - 1, 0);

    const context = await session.update(oldContext, interaction);
    return withContext.questionUi(context, interaction);
  },
);
