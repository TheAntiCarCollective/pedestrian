import postgresql, { useTransaction } from "../../../../services/postgresql";

import { CreatorType } from "../../constants";

// region Types
type StringId = {
  id: string;
};

type NumberId = {
  id: number;
};

type CreateSubscriptions = {
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
    const { rows } = await client.query<NumberId>(query, values);
    let row = rows[0];

    if (!row) {
      const query = `
        insert into creator(domain_id, type)
        values($1, $2)
        returning id
      `;

      const { rows } = await client.query<NumberId>(query, values);
      row = rows[0];
    }

    if (row !== undefined) return row.id;
    throw new Error(`${creatorType}: ${domainId}`);
  });

export const getCreatorChannelIds = async (guildId: string) => {
  const query = `
    select id
    from creator_channel
    where guild_id = $1
  `;

  const values = [guildId];
  const { rows } = await postgresql.query<StringId>(query, values);
  return rows.map(({ id }) => id);
};

export const createSubscriptions = async ({
  domainId,
  creatorType,
  creatorChannelIds,
}: CreateSubscriptions) => {
  const creatorId = await getOrCreateCreatorId(domainId, creatorType);

  const query = `
    insert into subscription(creator_channel_id, creator_id)
    values($1, $2)
    on conflict do nothing
  `;

  const promises = creatorChannelIds
    .map((creatorChannelId) => [creatorChannelId, creatorId])
    .map((values) => postgresql.query(query, values));

  return Promise.all(promises);
};
