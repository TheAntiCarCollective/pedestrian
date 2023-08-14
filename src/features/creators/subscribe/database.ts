import { ChannelType } from "discord.js";

import { useClient, useTransaction } from "../../../services/postgresql";

import { CreatorType } from "../constants";

// region Types
type CreatorSubscription = {
  creatorChannelId: string;
};

type CreatorChannel = {
  id: string;
  parentId: string | null;
  webhookId: string;
  webhookToken: string;
};

type CreateCreatorChannel = {
  id: string;
  type: ChannelType;
  guildId: string;
  parentId: string | null;
  webhookId: string;
  webhookToken: string;
};

type CreatorId = {
  id: number;
};

type CreateCreatorSubscriptions = {
  domainId: string;
  creatorType: CreatorType;
  creatorChannelIds: string[];
};
// endregion

export const getCreatorSubscriptions = (guildId: string) =>
  useClient(async (client) => {
    const query = `
      select cc.id as "creatorChannelId"
      from creator_subscription as cs
      inner join creator_channel as cc
        on cc.id = cs.creator_channel_id
      where cc.guild_id = $1
    `;

    const values = [guildId];
    const { rows } = await client.query<CreatorSubscription>(query, values);
    return rows;
  });

export const getCreatorChannels = (guildId: string) =>
  useClient(async (client) => {
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

export const createCreatorChannel = ({
  id,
  type,
  guildId,
  parentId,
  webhookId,
  webhookToken,
}: CreateCreatorChannel) =>
  useClient(async (client) => {
    const query = `
      insert into creator_channel(id, type, guild_id, parent_id, webhook_id, webhook_token)
      values($1, $2, $3, $4, $5, $6)
      on conflict do nothing
    `;

    return client.query(query, [
      id,
      type,
      guildId,
      parentId,
      webhookId,
      webhookToken,
    ]);
  });

const getOrCreateCreatorId = (domainId: string, creatorType: CreatorType) =>
  useTransaction(async (client) => {
    const query = `
      select id
      from creator
      where domain_id = $1
        and type = $2
    `;

    const values = [domainId, creatorType];
    const { rows } = await client.query<CreatorId>(query, values);
    let row = rows[0];

    if (row === undefined) {
      const query = `
        insert into creator(domain_id, type)
        values($1, $2)
        returning id
      `;

      const { rows } = await client.query<CreatorId>(query, values);
      row = rows[0];
    }

    if (row !== undefined) return row.id;
    throw new Error(`${creatorType}: ${domainId}`);
  });

export const createCreatorSubscriptions = ({
  domainId,
  creatorType,
  creatorChannelIds,
}: CreateCreatorSubscriptions) =>
  useClient(async (client) => {
    const creatorId = await getOrCreateCreatorId(domainId, creatorType);

    const query = `
      insert into creator_subscription(creator_channel_id, creator_id)
      values($1, $2)
      on conflict do nothing
    `;

    const promises = creatorChannelIds
      .map((creatorChannelId) => [creatorChannelId, creatorId])
      .map((values) => client.query(query, values));

    return Promise.all(promises);
  });
