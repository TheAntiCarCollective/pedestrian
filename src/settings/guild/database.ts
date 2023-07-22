import { useClient, useTransaction } from "../../services/postgresql";

import type { GuildSettings } from "./types";

export const getOrCreateGuildSettings = (guildId: string) =>
  useTransaction(async (client) => {
    const query = `
      SELECT
        id,
        max_creator_channels AS "maxCreatorChannels"
      FROM guilds
      WHERE id = $1
    `;

    const values = [guildId];
    const { rows } = await client.query<GuildSettings>(query, values);
    let guildSettings = rows[0];

    if (!guildSettings) {
      const query = `
        INSERT INTO guilds(id)
        VALUES($1)
        RETURNING
          id,
          max_creator_channels AS "maxCreatorChannels"
      `;

      const { rows } = await client.query<GuildSettings>(query, values);
      guildSettings = rows[0];
    }

    if (guildSettings) return guildSettings;
    throw new Error(guildId);
  });

export const setGuildSettings = (guildSettings: GuildSettings) =>
  useClient((client) => {
    const query = `
      UPDATE guilds
      SET max_creator_channels = $2
      WHERE id = $1
    `;

    const values = [guildSettings.id, guildSettings.maxCreatorChannels];
    return client.query(query, values);
  });
