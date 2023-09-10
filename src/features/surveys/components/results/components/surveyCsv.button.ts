import { AttachmentBuilder } from "discord.js";
import { stringify } from "csv-stringify";
import assert from "node:assert";

import { registerComponent } from "../../../../../services/discord";
import * as session from "../../../../../session";

import ComponentId from "./index";
import type Context from "../context";
import * as withContext from "../context";
import type { Answer } from "../../../types";

registerComponent(
  ComponentId.SurveyCsvButton,
  async (interaction, sessionId) => {
    const context = await session.read<Context>(sessionId);
    const questions = withContext.getQuestions(context);
    const answers = withContext.getAnswers(context);
    const { survey, results } = context;

    const columns = questions.map(({ ask: header }, index) => ({
      key: `${index}`,
      header,
    }));

    const rows = answers.map((_, answerIndex) => {
      const row = questions.reduce((map, _, questionIndex) => {
        const answers = results[questionIndex];
        assert(answers !== undefined);
        const cell = answers[answerIndex];
        assert(cell !== undefined);
        return map.set(`${questionIndex}`, cell);
      }, new Map<string, Answer>());

      return Object.fromEntries(row);
    });

    const stream = stringify(rows, {
      columns,
      header: true,
    });

    const attachment = new AttachmentBuilder(stream, {
      name: `${survey.title}.csv`,
    });

    return withContext.resultsUi(context, interaction, [attachment]);
  },
);
