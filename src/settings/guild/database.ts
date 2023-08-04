import { useClient, useTransaction } from "../../services/postgresql";

import type { GuildSettings } from "./types";

export const getOrCreateGuildSettings = (guildId: string) =>
  useTransaction(async (client) => {
    const query = `
      select
        id,
        max_creator_channels as "maxCreatorChannels",
        max_creator_subscriptions as "maxCreatorSubscriptions"
      from guild
      where id = $1
    `;

    const values = [guildId];
    const { rows } = await client.query<GuildSettings>(query, values);
    let guildSettings = rows[0];

    if (guildSettings === undefined) {
      const query = `
        insert into guild(id)
        values($1)
        returning
          id,
          max_creator_channels as "maxCreatorChannels",
          max_creator_subscriptions as "maxCreatorSubscriptions"
      `;

      const { rows } = await client.query<GuildSettings>(query, values);
      guildSettings = rows[0];
    }

    if (guildSettings !== undefined) return guildSettings;
    throw new Error(guildId);
  });

export const setGuildSettings = ({
  id,
  maxCreatorChannels,
  maxCreatorSubscriptions,
}: GuildSettings) =>
  useClient((client) => {
    const query = `
      update guild
      set
        max_creator_channels = $2,
        max_creator_subscriptions = $3
      where id = $1
    `;

    const values = [id, maxCreatorChannels, maxCreatorSubscriptions];
    return client.query(query, values);
  });
