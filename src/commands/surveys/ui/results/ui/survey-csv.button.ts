import { AttachmentBuilder } from "discord.js";
import { stringify } from "csv-stringify";
import assert from "node:assert";

import { registerComponent } from "../../../../../services/discord";

import { UIID } from "../ui";
import session, * as withContext from "../context";
import type { Answer } from "../../../types";

registerComponent(UIID.SurveyCsvButton, async (interaction, sessionId) => {
  const context = await session.read(sessionId);
  const questions = withContext.getQuestions(context);
  const answers = withContext.getAnswers(context);
  const { survey, results } = context;

  const columns = questions.map(({ ask: header }, index) => ({
    key: `${index}`,
    header,
  }));

  const rows = answers.map((_, answerIndex) => {
    const row: Record<number, Answer> = {};
    for (const [questionIndex] of questions.entries()) {
      const answers = results[questionIndex];
      assert(answers !== undefined);
      const cell = answers[answerIndex];
      assert(cell !== undefined);
      row[questionIndex] = cell;
    }

    return row;
  });

  const stream = stringify(rows, {
    columns,
    header: true,
  });

  const attachment = new AttachmentBuilder(stream, {
    name: `${survey.title}.csv`,
  });

  return withContext.resultsUi(context, interaction, [attachment]);
});
