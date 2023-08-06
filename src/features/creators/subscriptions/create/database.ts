import postgresql, { useTransaction } from "../../../../services/postgresql";

import { CreatorType } from "../../constants";

// region Types
type CreatorChannel = {
  id: string;
  creatorSubscriptionCount: number;
};

type Id = {
  id: number;
};

type CreateCreatorSubscriptions = {
  domainId: string;
  creatorType: CreatorType;
  creatorChannelIds: string[];
};
// endregion

const getOrCreateCreatorId = (domainId: string, creatorType: CreatorType) =>
  useTransaction(async (client) => {
    const query = `
      select id
      from creator
      where domain_id = $1
        and type = $2
    `;

    const values = [domainId, creatorType];
    const { rows } = await client.query<Id>(query, values);
    let row = rows[0];

    if (!row) {
      const query = `
        insert into creator(domain_id, type)
        values($1, $2)
        returning id
      `;

      const { rows } = await client.query<Id>(query, values);
      row = rows[0];
    }

    if (row !== undefined) return row.id;
    throw new Error(`${creatorType}: ${domainId}`);
  });

export const getCreatorChannels = async (guildId: string) => {
  const query = `
    select
      cc.id,
      count(cs.id) as "creatorSubscriptionCount"
    from creator_channel as cc
    left join creator_subscription as cs
      on cs.creator_channel_id = cc.id
    where cc.guild_id = $1
    group by cc.id
  `;

  const values = [guildId];
  const { rows } = await postgresql.query<CreatorChannel>(query, values);
  return rows;
};

export const createCreatorSubscriptions = async ({
  domainId,
  creatorType,
  creatorChannelIds,
}: CreateCreatorSubscriptions) => {
  const creatorId = await getOrCreateCreatorId(domainId, creatorType);

  const query = `
    insert into creator_subscription(creator_channel_id, creator_id)
    values($1, $2)
    on conflict do nothing
  `;

  const promises = creatorChannelIds
    .map((creatorChannelId) => [creatorChannelId, creatorId])
    .map((values) => postgresql.query(query, values));

  return Promise.all(promises);
};
