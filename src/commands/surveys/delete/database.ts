import caller from "../../../shared/caller";
import { useClient } from "../../../shared/postgresql";

// region Types
type PartialSurvey = {
  channelId: string;
  createdBy: string;
  id: string;
};
// endregion

export const getPartialSurvey = (guildId: string, title: string) =>
  useClient(caller(module, getPartialSurvey), async (client) => {
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
  useClient(caller(module, deleteSurvey), async (client) => {
    const query = `
      delete from survey
      where guild_id = $1
        and title = $2
    `;

    const values = [guildId, title];
    return client.query(query, values);
  });
