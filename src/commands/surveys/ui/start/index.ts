import assert from "node:assert";

import { registerComponent } from "../../../../services/discord";

import session, * as withContext from "./context";
import * as startDatabase from "./database";
import { UIID } from "../constants";
import * as surveysDatabase from "../../database";

registerComponent(UIID.StartSurveyButton, async (interaction, surveyId) => {
  const survey = await surveysDatabase.getSurvey(surveyId);
  assert(survey !== undefined);

  const { user: answerer } = interaction;
  const answers = await startDatabase.getAnswers(surveyId, answerer.id);

  const partialContext = {
    survey,
    answers,
    selectedIndex: 0,
  };

  const context = await session.create(partialContext, interaction);
  return withContext.answerUi(context, interaction);
});
