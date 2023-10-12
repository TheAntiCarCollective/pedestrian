import { GuildMember } from "discord.js";
import assert from "node:assert";

import type { Survey } from "../../types";

import { registerModal } from "../../../../shared/discord";
import UI from "../../ui";
import session from "../context";
import * as database from "../database";
import { UIID } from "../ui";

registerModal(UIID.CreateSurveyModal, async (interaction, sessionId) => {
  const { fields, member } = interaction;
  assert(member instanceof GuildMember);

  const response = await interaction.deferUpdate();
  await response.delete();

  const { survey: partialSurvey } = await session.read(sessionId);
  partialSurvey.description = fields.getTextInputValue(
    UIID.CreateSurveyDescriptionInput,
  );

  const message = await interaction.followUp(UI.survey(partialSurvey, member));

  const survey: Survey = {
    id: message.id,
    ...partialSurvey,
  };

  try {
    await database.createSurvey(survey);
    return await message.edit(UI.survey(survey, member));
  } catch (error) {
    await message.delete();
    throw error;
  } finally {
    await session.destroy(sessionId);
  }
});
