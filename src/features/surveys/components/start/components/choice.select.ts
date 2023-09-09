import assert from "node:assert";

import { registerComponent } from "../../../../../services/discord";
import * as session from "../../../../../session";

import ComponentId from "./index";
import type Context from "../context";
import * as withContext from "../context";

registerComponent(
  ComponentId.ChoiceSelectMenu,
  async (interaction, sessionId) => {
    assert(interaction.isStringSelectMenu());
    const { values } = interaction;
    const answer = values.map((value) => parseInt(value));

    const oldContext = await session.read<Context>(sessionId);
    oldContext.answers[oldContext.selectedIndex] = answer;

    const context = await session.update(oldContext, interaction);
    return withContext.answerUi(context, interaction);
  },
);
