import { useClient } from "../../../services/postgresql";

import type { CreatorSubscription } from "./types";

export const getCreatorSubscriptions = (guildId: string) =>
  useClient(async (client) => {
    const query = `
      select
        cs.id as "id",
        cc.id as "creatorChannelId",
        c.domain_id as "creatorDomainId",
        c.type as "creatorType"
      from creator_subscription as cs
      inner join creator_channel as cc
        on cc.id = cs.creator_channel_id
      inner join creator as c
        on c.id = cs.creator_id
      where cc.guild_id = $1
      order by c.id
    `;

    const values = [guildId];
    const { rows } = await client.query<CreatorSubscription>(query, values);
    return rows;
  });

export const deleteCreatorSubscriptions = (creatorSubscriptionIds: number[]) =>
  useClient((client) => {
    const query = `
      delete from creator_subscription
      where id = any($1)
    `;

    const values = [creatorSubscriptionIds];
    return client.query(query, values);
  });
