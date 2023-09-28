import { AttachmentBuilder } from "discord.js";
import { stringify } from "csv-stringify";
import { fail as error } from "node:assert";

import { registerComponent } from "../../../../../services/discord";

import { UIID } from "../ui";
import session, * as withContext from "../context";
import { isSelected, isSkipped } from "../../../functions";
import { QuestionType } from "../../../constants";

registerComponent(UIID.AnswersCsvButton, async (interaction, sessionId) => {
  const context = await session.read(sessionId);
  const question = withContext.getQuestion(context);
  const answers = withContext.getAnswers(context);

  const { type, ask } = question;
  let stream;

  switch (type) {
    case QuestionType.MultipleChoice: {
      const { choices } = question;
      const columns = choices.map(({ label: header }, index) => ({
        key: `${index}`,
        header,
      }));

      const rows = answers.map((answer) => {
        const row: Record<number, string | null> = {};
        for (const [index] of choices.entries()) {
          if (isSkipped(answer)) {
            row[index] = answer;
          } else if (isSelected(answer)) {
            row[index] = answer.includes(index) ? "✅" : "❌";
          } else {
            error();
          }
        }

        return row;
      });

      stream = stringify(rows, {
        columns,
        header: true,
      });

      break;
    }
    case QuestionType.OpenAnswer: {
      const rows = answers.map((answer) => [answer]);
      stream = stringify(rows);
      break;
    }
  }

  const attachment = new AttachmentBuilder(stream, {
    name: `${ask}.csv`,
  });

  return withContext.resultsUi(context, interaction, [attachment]);
});
