import type * as types from "./types";
import * as database from "./database";

// #region Types
export type GuildSettings = types.GuildSettings;
type PartialGuildSettings = Partial<GuildSettings> & Pick<GuildSettings, "id">;
// #endregion

function guildSettings(guildId: string): Promise<GuildSettings>;
function guildSettings(
  guildSettings: PartialGuildSettings,
): Promise<GuildSettings>;

async function guildSettings(parameter: string | PartialGuildSettings) {
  const guildId = typeof parameter === "string" ? parameter : parameter.id;
  const guildSettings = await database.getOrCreateGuildSettings(guildId);

  if (typeof parameter === "string") {
    return guildSettings;
  }

  const newGuildSettings = { ...guildSettings, ...parameter };
  await database.setGuildSettings(newGuildSettings);
  return newGuildSettings;
}

export default guildSettings;
