import { registerComponent } from "../../../../../services/discord";
import * as session from "../../../../../session";

import ComponentId from "./index";
import type Context from "../context";
import * as ui from "../ui";
import * as database from "../database";

registerComponent(
  ComponentId.CompleteButton,
  async (interaction, sessionId) => {
    const context = await session.read<Context>(sessionId);
    const { survey, answers } = context;

    const { user: answerer } = interaction;
    await database.createAnswers(survey.id, answerer.id, answers);

    const response = await interaction.update(ui.completed(context));
    await session.destroy(sessionId);
    return response;
  },
);
