import assert from "node:assert";

import { registerComponent } from "../../../../shared/discord";
import * as surveysDatabase from "../../database";
import { UIID } from "../../ui";
import session, * as withContext from "./context";
import * as startDatabase from "./database";

registerComponent(UIID.StartSurveyButton, async (interaction, surveyId) => {
  const survey = await surveysDatabase.getSurvey(surveyId);
  assert(survey !== undefined);

  const { user: answerer } = interaction;
  const answers = await startDatabase.getAnswers(surveyId, answerer.id);

  const partialContext = {
    answers,
    selectedIndex: 0,
    survey,
  };

  const context = await session.create(partialContext, interaction);
  return withContext.answerUi(context, interaction);
});
