import assert from "node:assert";

import { registerComponent } from "../../../../services/discord";

import { UIID } from "../ui";
import session, * as withContext from "../context";

registerComponent(UIID.ChoiceSelect, async (interaction, sessionId) => {
  assert(interaction.isStringSelectMenu());

  const oldContext = await session.read(sessionId);
  const value = interaction.values[0];

  if (value !== undefined) {
    oldContext.selectedChoiceIndex = Number.parseInt(value);
    const context = await session.update(oldContext, interaction);
    return withContext.questionUi(context, interaction);
  }

  return withContext.questionUi(oldContext, interaction);
});
