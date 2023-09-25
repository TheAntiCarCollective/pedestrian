import assert from "node:assert";

import { registerModal } from "../../../../services/discord";

import { UIID } from "./constants";
import session, * as withContext from "../context";

registerModal(UIID.ChoiceModal, async (interaction, sessionId) => {
  assert(interaction.isFromMessage());

  const oldContext = await session.read(sessionId);
  const choice = withContext.getChoice(oldContext);

  const { fields } = interaction;
  choice.label = fields.getTextInputValue(UIID.ChoiceLabelInput);
  choice.description = fields.getTextInputValue(UIID.ChoiceDescriptionInput);

  const context = await session.update(oldContext, interaction);
  return withContext.questionUi(context, interaction);
});
