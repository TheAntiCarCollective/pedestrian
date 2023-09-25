import assert from "node:assert";

import { registerComponent } from "../../../../services/discord";

import session, * as withContext from "./context";
import * as resultsDatabase from "./database";
import * as ui from "./ui";
import { UIID } from "../constants";
import * as surveysDatabase from "../../database";

registerComponent(UIID.SurveyResultsButton, async (interaction, surveyId) => {
  const survey = await surveysDatabase.getSurvey(surveyId);
  assert(survey !== undefined);

  const results = await resultsDatabase.getResults(surveyId);
  const { length: numberOfAnswers } = results[0] ?? [];
  if (numberOfAnswers === 0) return interaction.reply(ui.noResults(survey));

  const partialContext = {
    survey,
    results,
    selectedQuestionIndex: 0,
    selectedAnswerIndex: 0,
  };

  const context = await session.create(partialContext, interaction);
  return withContext.resultsUi(context, interaction);
});
