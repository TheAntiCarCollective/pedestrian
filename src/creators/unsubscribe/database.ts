import type { CreatorType } from "../constants";

import { caller } from "../../helpers";
import { useClient } from "../../services/postgresql";

// region Types
export type CreatorSubscription = {
  creatorChannelId: string;
  creatorDomainId: string;
};
// endregion

export const getCreatorSubscriptions = (
  guildId: string,
  creatorType: CreatorType,
) =>
  useClient(caller(module, getCreatorSubscriptions), async (client) => {
    const query = `
      select
        c.domain_id as "creatorDomainId",
        cc.id as "creatorChannelId"
      from creator_subscription as cs
      inner join creator_channel as cc
        on cc.id = cs.creator_channel_id
      inner join creator as c
        on c.id = cs.creator_id
      where cc.guild_id = $1
        and c.type = $2
    `;

    const values = [guildId, creatorType];
    const { rows } = await client.query<CreatorSubscription>(query, values);
    return rows;
  });

export const deleteCreatorSubscriptions = (
  creatorType: CreatorType,
  creatorSubscriptions: CreatorSubscription[],
) =>
  useClient(caller(module, deleteCreatorSubscriptions), (client) => {
    const query = `
      delete from creator_subscription as target
      using
        jsonb_to_recordset($2::jsonb) as source(
          "creatorDomainId" text,
          "creatorChannelId" bigint
        ),
        creator as c
      where target.creator_channel_id = source."creatorChannelId"
        and target.creator_id = c.id
        and c.type = $1
        and c.domain_id = source."creatorDomainId"
    `;

    const creatorSubscriptionsJson = JSON.stringify(creatorSubscriptions);
    const values = [creatorType, creatorSubscriptionsJson];
    return client.query(query, values);
  });
