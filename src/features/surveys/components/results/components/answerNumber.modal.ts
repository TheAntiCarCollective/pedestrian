import assert from "node:assert";

import { registerModal } from "../../../../../services/discord";
import * as session from "../../../../../session";

import ComponentId from "./index";
import type Context from "../context";
import * as withContext from "../context";

registerModal(ComponentId.AnswerNumberModal, async (interaction, sessionId) => {
  assert(interaction.isFromMessage());

  const { fields } = interaction;
  const rawAnswerNumber = fields.getTextInputValue(
    ComponentId.AnswerNumberInput,
  );

  const oldContext = await session.read<Context>(sessionId);
  const { length: numberOfAnswers } = withContext.getAnswers(oldContext);

  let answerNumber = parseInt(rawAnswerNumber);
  answerNumber = isNaN(answerNumber) ? 1 : answerNumber;
  answerNumber = Math.min(answerNumber, numberOfAnswers);
  answerNumber = Math.max(answerNumber, 1);
  oldContext.selectedAnswerIndex = answerNumber - 1;

  const context = await session.update(oldContext, interaction);
  return withContext.resultsUi(context, interaction);
});
