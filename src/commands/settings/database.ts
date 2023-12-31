import caller from "../../shared/caller";
import { useClient } from "../../shared/postgresql";

export const initializeGuilds = (guildIds: string[]) =>
  useClient(caller(module, initializeGuilds), (client) => {
    const query = `
      insert into guild(id)
      select id
      from unnest($1::bigint[]) as g(id)
      on conflict do nothing
    `;

    const values = [guildIds];
    return client.query(query, values);
  });
