import { AttachmentBuilder } from "discord.js";
import { stringify } from "csv-stringify";

import { registerComponent } from "../../../../../services/discord";
import * as session from "../../../../../session";

import ComponentId from "./index";
import type Context from "../context";
import * as withContext from "../context";
import type { OpenAnswer, SkippedAnswer } from "../../../types";
import { isSelected } from "../../../functions";

registerComponent(
  ComponentId.SurveyCsvButton,
  async (interaction, sessionId) => {
    const context = await session.read<Context>(sessionId);
    const questions = withContext.getQuestions(context);
    const { survey, results } = context;

    const columns = questions.map(({ ask: header }, index) => ({
      key: `${index}`,
      header,
    }));

    const rows = results.map((answers) => {
      const row = answers.reduce((map, cell, index) => {
        if (isSelected(cell)) cell = JSON.stringify(cell);
        return map.set(`${index}`, cell);
      }, new Map<string, OpenAnswer | SkippedAnswer>());

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
