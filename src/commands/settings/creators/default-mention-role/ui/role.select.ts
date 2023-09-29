import assert from "node:assert";

import { registerComponent } from "../../../../../services/discord";
import * as database from "../database";
import UI, { UIID } from "../ui";

registerComponent(UIID.RoleSelect, async (interaction) => {
  assert(interaction.isRoleSelectMenu());
  const { guildId, values } = interaction;
  assert(guildId !== null);

  const defaultMentionRoleId = values[0] ?? null;
  await database.setDefaultMentionRoleId(guildId, defaultMentionRoleId);

  return interaction.update(UI.setting(defaultMentionRoleId));
});
