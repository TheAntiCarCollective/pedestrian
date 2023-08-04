import postgresql from "../../../../services/postgresql";

import { CreatorType } from "../../constants";

// region Types
export type Subscription = {
  id: number;
  creatorChannelId: string;
  domainId: string;
  creatorType: CreatorType;
};
// endregion

export const getSubscriptions = async (guildId: string) => {
  const query = `
    select
      s.id,
      cc.id as "creatorChannelId",
      c.domain_id as "domainId",
      c.type as "creatorType"
    from subscription as s
    inner join creator_channel as cc
      on cc.id = s.creator_channel_id
    inner join creator as c
      on c.id = s.creator_id
    where cc.guild_id = $1
  `;

  const values = [guildId];
  const { rows } = await postgresql.query<Subscription>(query, values);
  return rows;
};

export const deleteSubscriptions = (subscriptionIds: number[]) => {
  const query = `
    delete from subscription
    where id = ANY($1)
  `;

  const values = [subscriptionIds];
  return postgresql.query(query, values);
};
