import assert from "node:assert";

import { registerModal } from "../../../../services/discord";
import * as session from "../../../../session";

import ComponentId from "./index";
import type Context from "../context";
import * as withContext from "../context";

registerModal(ComponentId.ChoiceModal, async (interaction, sessionId) => {
  assert(interaction.isFromMessage());
  const { fields } = interaction;

  const oldContext = await session.read<Context>(sessionId);
  const choice = withContext.getChoice(oldContext);
  choice.label = fields.getTextInputValue(ComponentId.ChoiceLabelInput);
  // prettier-ignore
  choice.description = fields.getTextInputValue(ComponentId.ChoiceDescriptionInput);

  const context = await session.update(oldContext, interaction);
  return withContext.questionUi(context, interaction);
});
