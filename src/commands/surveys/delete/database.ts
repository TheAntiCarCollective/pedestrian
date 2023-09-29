import { useClient } from "../../../services/postgresql";

// region Types
type PartialSurvey = {
  channelId: string;
  createdBy: string;
  id: string;
};
// endregion

export const getPartialSurvey = (guildId: string, title: string) =>
  useClient(`${__filename}#getPartialSurvey`, async (client) => {
    const query = `
      select
        id,
        channel_id as "channelId",
        created_by as "createdBy"
      from survey
      where guild_id = $1
        and title = $2
    `;

    const values = [guildId, title];
    const { rows } = await client.query<PartialSurvey>(query, values);
    return rows[0];
  });

export const deleteSurvey = (guildId: string, title: string) =>
  useClient(`${__filename}#deleteSurvey`, async (client) => {
    const query = `
      delete from survey
      where guild_id = $1
        and title = $2
    `;

    const values = [guildId, title];
    return client.query(query, values);
  });
