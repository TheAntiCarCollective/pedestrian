import assert from "node:assert";

import { registerModal } from "../../../../../services/discord";
import * as session from "../../../../../session";

import ComponentId from "./index";
import type Context from "../context";
import * as withContext from "../context";

registerModal(ComponentId.AnswerModal, async (interaction, sessionId) => {
  assert(interaction.isFromMessage());
  const { fields } = interaction;

  const oldContext = await session.read<Context>(sessionId);
  oldContext.answers[oldContext.selectedIndex] =
    // prettier-ignore
    fields.getTextInputValue(ComponentId.AnswerInput);

  const context = await session.update(oldContext, interaction);
  return withContext.answerUi(context, interaction);
});
