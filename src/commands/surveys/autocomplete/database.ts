import { useClient } from "../../../services/postgresql";

// region Types
type Title = {
  title: string;
};
// endregion

export const findTitles = (guildId: string, partialTitle: string) =>
  useClient(`${__filename}#findTitles`, async (client) => {
    const query = `
      select title
      from survey
      where guild_id = $1
        and title like $2 || '%'
      order by title
      limit 25
    `;

    const values = [guildId, partialTitle];
    const { rows } = await client.query<Title>(query, values);
    return rows.map(({ title }) => title);
  });
