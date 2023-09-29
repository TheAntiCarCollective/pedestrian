import { PoolClient } from "pg";

import { useClient, useTransaction } from "../../services/postgresql";
import { CreatorType } from "../constants";

// region Types
type CreatorSubscription = {
  creatorChannelId: string;
};

type CreatorChannel = {
  id: string;
  parentId: null | string;
  webhookId: string;
  webhookToken: string;
};

type CreateCreator = {
  domainId: string;
  type: CreatorType;
};

type CreateCreatorChannel = CreatorChannel & {
  guildId: string;
};

type CreateCreatorSubscription = CreateCreator & CreateCreatorChannel;
// endregion

export const getCreatorSubscriptions = (
  creatorType: CreatorType,
  guildId: string,
) =>
  useClient(`${__filename}#getCreatorSubscriptions`, async (client) => {
    const query = `
      select cc.id as "creatorChannelId"
      from creator_subscription as cs
      inner join creator_channel as cc
        on cc.id = cs.creator_channel_id
      inner join creator as c
        on c.id = cs.creator_id
      where c.type = $1
        and cc.guild_id = $2
    `;

    const values = [creatorType, guildId];
    const { rows } = await client.query<CreatorSubscription>(query, values);
    return rows;
  });

export const getCreatorChannels = (guildId: string) =>
  useClient(`${__filename}#getCreatorChannels`, async (client) => {
    const query = `
      select
        id,
        parent_id as "parentId",
        webhook_id as "webhookId",
        webhook_token as "webhookToken"
      from creator_channel
      where guild_id = $1
    `;

    const values = [guildId];
    const { rows } = await client.query<CreatorChannel>(query, values);
    return rows;
  });

const createCreator = (
  client: PoolClient,
  { domainId, type }: CreateCreator,
) => {
  const query = `
    insert into creator(domain_id, type)
    values ($1, $2)
    on conflict do nothing
  `;

  const values = [domainId, type];
  return client.query(query, values);
};

const createCreatorChannel = (
  client: PoolClient,
  { guildId, id, parentId, webhookId, webhookToken }: CreateCreatorChannel,
) => {
  const query = `
    insert into creator_channel(id, guild_id, webhook_id, webhook_token, parent_id)
    values($1, $2, $3, $4, $5)
    on conflict do nothing
  `;

  const values = [id, guildId, webhookId, webhookToken, parentId];
  return client.query(query, values);
};

export const createCreatorSubscription = (
  creatorSubscription: CreateCreatorSubscription,
) =>
  useTransaction(`${__filename}#createCreatorSubscription`, async (client) => {
    await createCreator(client, creatorSubscription);
    await createCreatorChannel(client, creatorSubscription);
    const { domainId, id, type } = creatorSubscription;

    const query = `
      insert into creator_subscription(creator_channel_id, creator_id)
      select
        $1 as creator_channel_id,
        id as creator_id
      from creator
      where type = $2
        and domain_id = $3
      on conflict do nothing
    `;

    const values = [id, type, domainId];
    return client.query(query, values);
  });
