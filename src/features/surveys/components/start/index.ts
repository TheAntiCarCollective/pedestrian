import assert from "node:assert";

import { registerComponent } from "../../../../services/discord";
import * as session from "../../../../session";

import type Context from "./context";
import * as withContext from "./context";
import * as startDatabase from "./database";
import ComponentId from "../index";
import * as surveysDatabase from "../../database";

// Install
import "./components/answer.button";
import "./components/answer.modal";
import "./components/cancel.button";
import "./components/choice.select";
import "./components/complete.button";
import "./components/nextQuestion.button";
import "./components/previousQuestion.button";
import "./components/skipAnswer.button";

registerComponent(
  ComponentId.StartSurveyButton,
  async (interaction, surveyId) => {
    const survey = await surveysDatabase.getSurvey(surveyId);
    assert(survey !== undefined);

    const { user: answerer } = interaction;
    const answers = await startDatabase.getAnswers(surveyId, answerer.id);

    const partialContext = {
      survey,
      answers,
      selectedIndex: 0,
    };

    const context = await session.create<Context>(partialContext, interaction);
    return withContext.answerUi(context, interaction);
  },
);
