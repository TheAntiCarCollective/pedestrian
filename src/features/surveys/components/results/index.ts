import assert from "node:assert";

import { registerComponent } from "../../../../services/discord";
import * as session from "../../../../session";

import type Context from "./context";
import * as withContext from "./context";
import * as resultsDatabase from "./database";
import * as ui from "./ui";
import ComponentId from "../index";
import * as surveysDatabase from "../../database";

// Install
import "./components/answerNumber.button";
import "./components/answerNumber.modal";
import "./components/answersCsv.button";
import "./components/close.button";
import "./components/nextAnswer.button";
import "./components/nextQuestion.button";
import "./components/previousAnswer.button";
import "./components/previousQuestion.button";
import "./components/surveyCsv.button";

registerComponent(
  ComponentId.SurveyResultsButton,
  async (interaction, surveyId) => {
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

    const context = await session.create<Context>(partialContext, interaction);
    return withContext.resultsUi(context, interaction);
  },
);
