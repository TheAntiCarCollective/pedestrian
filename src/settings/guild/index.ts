import type * as types from "./types";
import * as database from "./database";

// region Types
export type GuildSettings = types.GuildSettings;
type PartialGuildSettings = Partial<GuildSettings> & Pick<GuildSettings, "id">;
// endregion

const guildSettings = async (parameter: string | PartialGuildSettings) => {
  const isGuildId = typeof parameter === "string";
  const guildId = isGuildId ? parameter : parameter.id;
  const guildSettings = await database.getOrCreateGuildSettings(guildId);

  if (isGuildId) return guildSettings;

  const newGuildSettings = {
    ...guildSettings,
    ...parameter,
  };

  await database.setGuildSettings(newGuildSettings);
  return newGuildSettings;
};

export default guildSettings;
