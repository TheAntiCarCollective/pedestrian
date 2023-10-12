import type { CreatorType } from "../constants";

import caller from "../../shared/caller";
import { useClient } from "../../shared/postgresql";

// region Types
export type CreatorSubscription = {
  createdAt: Date;
  creatorChannelId: string;
  creatorChannelParentId: null | string;
  creatorDomainId: string;
  creatorMentionRoleId: null | string;
  creatorType: CreatorType;
  guildId: string;
  lastContentId: null | string;
  webhookId: string;
  webhookToken: string;
};

export type CreatorPost = {
  contentId: string;
  creatorChannelId: string;
  creatorDomainId: string;
  creatorType: CreatorType;
  id: string;
};

type ContentId = {
  contentId: string;
};
// endregion

export const getCreatorSubscriptions = (guildIds: string[]) =>
  useClient(caller(module, getCreatorSubscriptions), async (client) => {
    const query = `
      select
        g.id as "guildId",
        cs.created_at as "createdAt",
        coalesce(
          cs.creator_mention_role_id,
          cc.creator_mention_role_id,
          g.creator_mention_role_id
        ) as "creatorMentionRoleId",
        cp.content_id as "lastContentId",
        c.domain_id as "creatorDomainId",
        c.type as "creatorType",
        cc.id as "creatorChannelId",
        cc.parent_id as "creatorChannelParentId",
        cc.webhook_id as "webhookId",
        cc.webhook_token as "webhookToken"
      from creator_subscription as cs
      inner join creator as c
        on c.id = cs.creator_id
      inner join creator_channel as cc
        on cc.id = cs.creator_channel_id
      inner join guild as g
        on g.id = cc.guild_id
      left join lateral(
        select content_id
        from creator_post
        where creator_subscription_id = cs.id
        order by id desc
        limit 1
      ) as cp
      on true
      where g.id = any($1)
    `;

    const values = [guildIds];
    const { rows } = await client.query<CreatorSubscription>(query, values);
    return rows;
  });

export const createCreatorPosts = (creatorPosts: CreatorPost[]) =>
  useClient(caller(module, createCreatorPosts), (client) => {
    const query = `
      insert into creator_post(id, creator_subscription_id, content_id)
      select
        cp.id,
        cs.id as creator_subscription_id,
        cp."contentId" as content_id
      from jsonb_to_recordset($1::jsonb) as cp(
        id bigint,
        "creatorChannelId" bigint,
        "creatorType" creator_type,
        "creatorDomainId" text,
        "contentId" text
      )
      inner join creator_subscription as cs
        on cs.creator_channel_id = cp."creatorChannelId"
      inner join creator as c
        on c.id = cs.creator_id
      where c.type = cp."creatorType"
        and c.domain_id = cp."creatorDomainId"
    `;

    const creatorPostsJson = JSON.stringify(creatorPosts);
    const values = [creatorPostsJson];
    return client.query(query, values);
  });

export const getPostedContentIds = (
  { creatorChannelId, creatorDomainId, creatorType }: CreatorSubscription,
  contentIds: string[],
) =>
  useClient(caller(module, getPostedContentIds), async (client) => {
    const query = `
      select cp.content_id as "contentId"
      from creator_post as cp
      inner join creator_subscription as cs
        on cs.id = cp.creator_subscription_id
      inner join creator as c
        on c.id = cs.creator_id
      where cs.creator_channel_id = $1
        and c.domain_id = $2
        and c.type = $3
        and cp.content_id = any($4)
    `;

    const values = [creatorChannelId, creatorDomainId, creatorType, contentIds];
    const { rows } = await client.query<ContentId>(query, values);
    return rows.map(({ contentId }) => contentId);
  });
