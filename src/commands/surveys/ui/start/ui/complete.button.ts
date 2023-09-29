import { registerComponent } from "../../../../../services/discord";
import session from "../context";
import * as database from "../database";
import UI, { UIID } from "../ui";

registerComponent(UIID.CompleteButton, async (interaction, sessionId) => {
  const context = await session.read(sessionId);
  const { answers, survey } = context;

  const { user: answerer } = interaction;
  await database.createAnswers(survey.id, answerer.id, answers);

  const response = await interaction.update(UI.completed(context));
  await session.destroy(sessionId);
  return response;
});
