import { useClient } from "../../services/postgresql";

export const initializeGuilds = (guildIds: string[]) =>
  useClient(`${__filename}#initializeGuild`, (client) => {
    const query = `
      insert into guild(id)
      select id
      from unnest($1::bigint[]) as g(id)
      on conflict do nothing
    `;

    const values = [guildIds];
    return client.query(query, values);
  });