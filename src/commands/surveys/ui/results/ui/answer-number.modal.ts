import assert from "node:assert";

import { registerModal } from "../../../../../services/discord";
import session, * as withContext from "../context";
import { UIID } from "../ui";

registerModal(UIID.AnswerNumberModal, async (interaction, sessionId) => {
  assert(interaction.isFromMessage());

  const { fields } = interaction;
  const rawAnswerNumber = fields.getTextInputValue(UIID.AnswerNumberInput);

  const oldContext = await session.read(sessionId);
  const { length: numberOfAnswers } = withContext.getAnswers(oldContext);

  let answerNumber = Number.parseInt(rawAnswerNumber);
  answerNumber = Number.isNaN(answerNumber) ? 1 : answerNumber;
  answerNumber = Math.min(answerNumber, numberOfAnswers);
  answerNumber = Math.max(answerNumber, 1);
  oldContext.selectedAnswerIndex = answerNumber - 1;

  const context = await session.update(oldContext, interaction);
  return withContext.resultsUi(context, interaction);
});
