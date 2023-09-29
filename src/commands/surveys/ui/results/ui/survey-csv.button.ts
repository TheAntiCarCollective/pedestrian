import { stringify } from "csv-stringify";
import { AttachmentBuilder } from "discord.js";
import assert from "node:assert";

import type { Answer } from "../../../types";

import { registerComponent } from "../../../../../services/discord";
import session, * as withContext from "../context";
import { UIID } from "../ui";

registerComponent(UIID.SurveyCsvButton, async (interaction, sessionId) => {
  const context = await session.read(sessionId);
  const questions = withContext.getQuestions(context);
  const answers = withContext.getAnswers(context);
  const { results, survey } = context;

  const columns = questions.map(({ ask: header }, index) => ({
    header,
    key: `${index}`,
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
