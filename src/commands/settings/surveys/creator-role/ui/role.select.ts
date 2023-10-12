import assert from "node:assert";

import { registerComponent } from "../../../../../shared/discord";
import * as database from "../database";
import UI, { UIID } from "../ui";

registerComponent(UIID.RoleSelect, async (interaction) => {
  assert(interaction.isRoleSelectMenu());
  const { guildId, values } = interaction;
  assert(guildId !== null);

  const surveyCreatorRoleId = values[0] ?? null;
  await database.setSurveyCreatorRoleId(guildId, surveyCreatorRoleId);

  return interaction.update(UI.setting(surveyCreatorRoleId));
});
