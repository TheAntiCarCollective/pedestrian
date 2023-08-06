import { useClient } from "../../services/postgresql";

// region Types
type Id = {
  id: string;
};
// endregion

export const getCreatorChannelIds = (guildId: string) =>
  useClient(async (client) => {
    const query = `
      select id
      from creator_channel
      where guild_id = $1
    `;

    const values = [guildId];
    const { rows } = await client.query<Id>(query, values);
    return rows.map(({ id }) => id);
  });

export const deleteCreatorChannel = (channelId: string) =>
  useClient((client) => {
    const query = `
      delete from creator_channel
      where id = $1
    `;

    const values = [channelId];
    return client.query(query, values);
  });
