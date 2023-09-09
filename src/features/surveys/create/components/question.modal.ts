import { registerModal } from "../../../../services/discord";
import * as session from "../../../../session";

import ComponentId from "./index";
import type Context from "../context";
import * as withContext from "../context";

registerModal(ComponentId.QuestionModal, async (interaction, sessionId) => {
  const oldContext = await session.read<Context>(sessionId);
  const question = withContext.getQuestion(oldContext);

  const { fields } = interaction;
  question.ask = fields.getTextInputValue(ComponentId.QuestionAskInput);
  // prettier-ignore
  question.description = fields.getTextInputValue(ComponentId.QuestionDescriptionInput);

  const context = await session.update(oldContext, interaction);
  return withContext.questionUi(context, interaction);
});
