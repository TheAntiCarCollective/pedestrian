import assert from "node:assert";

import { registerComponent } from "../../../../../services/discord";

import * as ui from "./index";
import { UIID } from "./constants";
import * as database from "../database";

registerComponent(UIID.RoleSelect, async (interaction) => {
  assert(interaction.isRoleSelectMenu());
  const { guildId, values } = interaction;
  assert(guildId !== null);

  const surveyCreatorRoleId = values[0] ?? null;
  await database.setSurveyCreatorRoleId(guildId, surveyCreatorRoleId);

  return interaction.update(ui.setting(surveyCreatorRoleId));
});
