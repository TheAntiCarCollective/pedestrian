import assert from "node:assert";

import { registerModal } from "../../../../services/discord";
import * as session from "../../../../session";

import ComponentId from "./index";
import type Context from "../context";
import * as withContext from "../context";
import { isMultipleChoice } from "../../functions";

registerModal(
  ComponentId.ChoiceSettingsModal,
  async (interaction, sessionId) => {
    assert(interaction.isFromMessage());
    const { fields } = interaction;

    // prettier-ignore
    const rawMinValues = fields.getTextInputValue(ComponentId.ChoiceMinValuesInput);
    // prettier-ignore
    const rawMaxValues = fields.getTextInputValue(ComponentId.ChoiceMaxValuesInput);

    let minValues = parseInt(rawMinValues);
    minValues = isNaN(minValues) ? 1 : minValues;
    let maxValues = parseInt(rawMaxValues);
    maxValues = isNaN(maxValues) ? 1 : maxValues;

    minValues = Math.min(minValues, 25);
    minValues = Math.max(minValues, 1);
    maxValues = Math.min(maxValues, 25);
    maxValues = Math.max(maxValues, 1);
    maxValues = Math.max(minValues, maxValues);

    const oldContext = await session.read<Context>(sessionId);
    const question = withContext.getQuestion(oldContext, isMultipleChoice);
    question.minValues = minValues;
    question.maxValues = maxValues;

    const context = await session.update(oldContext, interaction);
    return withContext.questionUi(context, interaction);
  },
);
