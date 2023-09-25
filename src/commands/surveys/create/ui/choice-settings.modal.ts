import assert from "node:assert";

import { registerModal } from "../../../../services/discord";

import { UIID } from "./constants";
import session, * as withContext from "../context";
import { isMultipleChoice } from "../../functions";

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
