import assert from "node:assert";

import { registerComponent } from "../../../../services/discord";
import * as surveysDatabase from "../../database";
import { UIID } from "../../ui";
import session, * as withContext from "./context";
import * as resultsDatabase from "./database";
import UI from "./ui";

registerComponent(UIID.SurveyResultsButton, async (interaction, surveyId) => {
  const survey = await surveysDatabase.getSurvey(surveyId);
  assert(survey !== undefined);

  const results = await resultsDatabase.getResults(surveyId);
  const { length: numberOfAnswers } = results[0] ?? [];
  if (numberOfAnswers === 0) return interaction.reply(UI.noResults(survey));

  const partialContext = {
    results,
    selectedAnswerIndex: 0,
    selectedQuestionIndex: 0,
    survey,
  };

  const context = await session.create(partialContext, interaction);
  return withContext.resultsUi(context, interaction);
});
