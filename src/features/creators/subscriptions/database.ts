import postgresql from "../../../services/postgresql";

// #region
type Id = {
  id: string;
};
// #endregion

export const getCreatorChannelIds = async (guildId: string) => {
  const query = `
    SELECT id
    FROM creator_channels
    WHERE guild_id = $1
  `;

  const values = [guildId];
  const { rows } = await postgresql.query<Id>(query, values);
  return rows.map(({ id }) => id);
};

export const deleteCreatorChannel = (channelId: string) => {
  const query = `
    DELETE FROM creator_channels
    WHERE id = $1
  `;

  const values = [channelId];
  return postgresql.query(query, values);
};
