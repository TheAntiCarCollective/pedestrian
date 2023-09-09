import { useClient } from "../../../services/postgresql";

// region Types
type DeletedSurvey = {
  id: string;
  channelId: string;
};
// endregion

export const deleteSurvey = (guildId: string, title: string) =>
  useClient(async (client) => {
    const query = `
      delete from survey
      where guild_id = $1
        and title = $2
      returning
        id,
        channel_id as "channelId"
    `;

    const values = [guildId, title];
    const { rows } = await client.query<DeletedSurvey>(query, values);
    return rows[0];
  });
