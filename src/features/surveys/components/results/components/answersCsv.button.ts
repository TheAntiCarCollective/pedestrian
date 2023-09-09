import { AttachmentBuilder } from "discord.js";
import type Stream from "stream";
import { stringify } from "csv-stringify";
import { fail as error } from "node:assert";

import { registerComponent } from "../../../../../services/discord";
import * as session from "../../../../../session";

import ComponentId from "./index";
import type Context from "../context";
import * as withContext from "../context";
import { isSelected, isSkipped } from "../../../functions";
import { QuestionType } from "../../../constants";

registerComponent(
  ComponentId.AnswersCsvButton,
  async (interaction, sessionId) => {
    const context = await session.read<Context>(sessionId);
    const question = withContext.getQuestion(context);
    const answers = withContext.getAnswers(context);

    const { type, ask } = question;
    let stream: Stream;

    switch (type) {
      case QuestionType.MultipleChoice: {
        const { choices } = question;
        const columns = choices.map(({ label: header }, index) => ({
          key: `${index}`,
          header,
        }));

        const rows = answers.map((answer) => {
          if (isSkipped(answer)) {
            return choices.map(() => null);
          } else if (isSelected(answer)) {
            const row = choices.reduce((map, _, index) => {
              const cell = answer.includes(index) ? "✅" : "❌";
              return map.set(`${index}`, cell);
            }, new Map<string, string>());

            return Object.fromEntries(row);
          } else {
            error();
          }
        });

        stream = stringify(rows, {
          columns,
          header: true,
        });

        break;
      }
      case QuestionType.OpenAnswer:
        stream = stringify(answers);
        break;
    }

    const attachment = new AttachmentBuilder(stream, {
      name: `${ask}.csv`,
    });

    return withContext.resultsUi(context, interaction, [attachment]);
  },
);
