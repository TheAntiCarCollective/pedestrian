import { registerModal } from "../../../../shared/discord";
import session, * as withContext from "../context";
import { UIID } from "../ui";

registerModal(UIID.QuestionModal, async (interaction, sessionId) => {
  const oldContext = await session.read(sessionId);
  const question = withContext.getQuestion(oldContext);

  const { fields } = interaction;
  question.ask = fields.getTextInputValue(UIID.QuestionAskInput);
  // prettier-ignore
  question.description = fields.getTextInputValue(UIID.QuestionDescriptionInput);

  const context = await session.update(oldContext, interaction);
  return withContext.questionUi(context, interaction);
});
