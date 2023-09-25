import assert from "node:assert";

import { registerComponent } from "../../../../../services/discord";

import * as ui from "./index";
import { UIID } from "./constants";
import * as database from "../database";

registerComponent(UIID.RoleSelect, async (interaction, channelId) => {
  assert(interaction.isRoleSelectMenu());
  const { values } = interaction;

  const channelMentionRoleId = values[0] ?? null;
  await database.setChannelMentionRoleId(channelId, channelMentionRoleId);

  return interaction.update(ui.setting(channelId, channelMentionRoleId));
});