import assert from "node:assert";

import { registerModal } from "../../../../shared/discord";
import { isMultipleChoice } from "../../functions";
import session, * as withContext from "../context";
import { UIID } from "../ui";

registerModal(UIID.ChoiceSettingsModal, async (interaction, sessionId) => {
  assert(interaction.isFromMessage());

  const { fields } = interaction;
  const rawMinValues = fields.getTextInputValue(UIID.ChoiceMinValuesInput);
  const rawMaxValues = fields.getTextInputValue(UIID.ChoiceMaxValuesInput);

  let minValues = Number.parseInt(rawMinValues);
  minValues = Number.isNaN(minValues) ? 1 : minValues;
  let maxValues = Number.parseInt(rawMaxValues);
  maxValues = Number.isNaN(maxValues) ? 1 : maxValues;

  minValues = Math.min(minValues, 25);
  minValues = Math.max(minValues, 1);
  maxValues = Math.min(maxValues, 25);
  maxValues = Math.max(maxValues, 1);
  maxValues = Math.max(minValues, maxValues);

  const oldContext = await session.read(sessionId);
  const question = withContext.getQuestion(oldContext, isMultipleChoice);
  question.minValues = minValues;
  question.maxValues = maxValues;

  const context = await session.update(oldContext, interaction);
  return withContext.questionUi(context, interaction);
});
