import csv from "csv";
import { AttachmentBuilder } from "discord.js";
import assert from "node:assert";

import { registerComponent } from "../../../../../shared/discord";
import { QuestionType } from "../../../constants";
import { isSelected, isSkipped } from "../../../functions";
import session, * as withContext from "../context";
import { UIID } from "../ui";

registerComponent(UIID.AnswersCsvButton, async (interaction, sessionId) => {
  const context = await session.read(sessionId);
  const question = withContext.getQuestion(context);
  const answers = withContext.getAnswers(context);

  const { ask, type } = question;
  let stream;

  switch (type) {
    case QuestionType.MultipleChoice: {
      const { choices } = question;
      const columns = choices.map(({ label: header }, index) => ({
        header,
        key: `${index}`,
      }));

      const rows = answers.map((answer) => {
        const row: Record<number, null | string> = {};
        for (const [index] of choices.entries()) {
          if (isSkipped(answer)) {
            row[index] = answer;
          } else if (isSelected(answer)) {
            row[index] = answer.includes(index) ? "✅" : "❌";
          } else {
            assert.fail();
          }
        }

        return row;
      });

      stream = csv.stringify(rows, {
        columns,
        header: true,
      });

      break;
    }
    case QuestionType.OpenAnswer: {
      const rows = answers.map((answer) => [answer]);
      stream = csv.stringify(rows);
      break;
    }
  }

  const attachment = new AttachmentBuilder(stream, {
    name: `${ask}.csv`,
  });

  return withContext.resultsUi(context, interaction, [attachment]);
});
