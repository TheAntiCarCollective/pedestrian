import assert from "node:assert";

import { registerComponent } from "../../../../services/discord";
import * as session from "../../../../session";

import ComponentId from "./index";
import type Context from "../context";
import * as withContext from "../context";

registerComponent(ComponentId.ChoiceSelect, async (interaction, sessionId) => {
  assert(interaction.isStringSelectMenu());

  const oldContext = await session.read<Context>(sessionId);
  const value = interaction.values[0];

  if (value !== undefined) {
    oldContext.selectedChoiceIndex = parseInt(value);
    const context = await session.update(oldContext, interaction);
    return withContext.questionUi(context, interaction);
  }

  return withContext.questionUi(oldContext, interaction);
});
