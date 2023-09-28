import assert from "node:assert";

import { registerComponent } from "../../../../../services/discord";

import { UIID } from "../ui";
import session, * as withContext from "../context";

registerComponent(UIID.ChoiceSelect, async (interaction, sessionId) => {
  assert(interaction.isStringSelectMenu());
  const { values } = interaction;
  const answer = values.map((value) => Number.parseInt(value));

  const oldContext = await session.read(sessionId);
  oldContext.answers[oldContext.selectedIndex] = answer;

  const context = await session.update(oldContext, interaction);
  return withContext.answerUi(context, interaction);
});
