import postgresql from "../../../../services/postgresql";

import { CreatorType } from "../../constants";

// region Types
export type CreatorSubscription = {
  id: number;
  creatorChannelId: string;
  domainId: string;
  creatorType: CreatorType;
};
// endregion

export const getCreatorSubscriptions = async (guildId: string) => {
  const query = `
    select
      cs.id,
      cc.id as "creatorChannelId",
      c.domain_id as "domainId",
      c.type as "creatorType"
    from creator_subscription as cs
    inner join creator_channel as cc
      on cc.id = cs.creator_channel_id
    inner join creator as c
      on c.id = cs.creator_id
    where cc.guild_id = $1
  `;

  const values = [guildId];
  const { rows } = await postgresql.query<CreatorSubscription>(query, values);
  return rows;
};

export const deleteCreatorSubscriptions = (
  creatorSubscriptionIds: number[],
) => {
  const query = `
    delete from creator_subscription
    where id = ANY($1)
  `;

  const values = [creatorSubscriptionIds];
  return postgresql.query(query, values);
};
