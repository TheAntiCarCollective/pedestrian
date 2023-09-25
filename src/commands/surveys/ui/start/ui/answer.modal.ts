import assert from "node:assert";

import { registerModal } from "../../../../../services/discord";

import { UIID } from "./constants";
import session, * as withContext from "../context";

registerModal(UIID.AnswerModal, async (interaction, sessionId) => {
  assert(interaction.isFromMessage());
  const { fields } = interaction;

  const oldContext = await session.read(sessionId);
  oldContext.answers[oldContext.selectedIndex] =
    // prettier-ignore
    fields.getTextInputValue(UIID.AnswerInput);

  const context = await session.update(oldContext, interaction);
  return withContext.answerUi(context, interaction);
});
