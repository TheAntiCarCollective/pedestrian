import assert from "node:assert";

import { registerComponent } from "../../../../../services/discord";

import UI, { UIID } from "../ui";
import * as database from "../database";

registerComponent(UIID.RoleSelect, async (interaction) => {
  assert(interaction.isRoleSelectMenu());
  const { guildId, values } = interaction;
  assert(guildId !== null);

  const defaultMentionRoleId = values[0] ?? null;
  await database.setDefaultMentionRoleId(guildId, defaultMentionRoleId);

  return interaction.update(UI.setting(defaultMentionRoleId));
});
