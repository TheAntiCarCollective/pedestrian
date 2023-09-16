import { GuildMember } from "discord.js";
import assert from "node:assert";

import { registerModal } from "../../../../services/discord";
import * as session from "../../../../session";

import ComponentId from "./index";
import type Context from "../context";
import * as database from "../database";
import type { Survey } from "../../types";
import * as ui from "../../ui";

registerModal(ComponentId.CreateSurveyModal, async (interaction, sessionId) => {
  const { fields, member } = interaction;
  assert(member instanceof GuildMember);

  const response = await interaction.deferUpdate();
  await response.delete();

  const { survey: partialSurvey } = await session.read<Context>(sessionId);
  partialSurvey.description = fields.getTextInputValue(
    ComponentId.CreateSurveyDescriptionInput,
  );

  const message = await interaction.followUp(ui.survey(partialSurvey, member));

  const survey: Survey = {
    id: message.id,
    ...partialSurvey,
  };

  try {
    await database.createSurvey(survey);
    return await message.edit(ui.survey(survey, member));
  } catch (error) {
    await message.delete();
    throw error;
  } finally {
    await session.destroy(sessionId);
  }
});
