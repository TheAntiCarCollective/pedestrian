import { registerComponent } from "../../../../../services/discord";

import * as ui from "./index";
import { UIID } from "./constants";
import session from "../context";
import * as database from "../database";

registerComponent(UIID.CompleteButton, async (interaction, sessionId) => {
  const context = await session.read(sessionId);
  const { survey, answers } = context;

  const { user: answerer } = interaction;
  await database.createAnswers(survey.id, answerer.id, answers);

  const response = await interaction.update(ui.completed(context));
  await session.destroy(sessionId);
  return response;
});