import assert from "node:assert";

import { registerComponent } from "../../../../../services/discord";

import UI, { UIID } from "../ui";
import * as database from "../database";

registerComponent(UIID.RoleSelect, async (interaction, channelId) => {
  assert(interaction.isRoleSelectMenu());
  const { values } = interaction;

  const channelMentionRoleId = values[0] ?? null;
  await database.setChannelMentionRoleId(channelId, channelMentionRoleId);

  return interaction.update(UI.setting(channelId, channelMentionRoleId));
});
