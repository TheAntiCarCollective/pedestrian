import { useClient } from "../../services/postgresql";

import { CreatorType } from "../constants";

// region Types
export type CreatorSubscription = {
  guildId: string;
  createdAt: Date;
  creatorMentionRoleId: string | null;
  lastContentId: string | null;
  creatorDomainId: string;
  creatorType: CreatorType;
  creatorChannelId: string;
  creatorChannelParentId: string | null;
  webhookId: string;
  webhookToken: string;
};

export type CreatorPost = {
  id: string;
  creatorChannelId: string;
  creatorType: CreatorType;
  creatorDomainId: string;
  contentId: string;
};
// endregion

export const getCreatorSubscriptions = (guildIds: string[]) =>
  useClient(`${__filename}#getCreatorSubscriptions`, async (client) => {
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
  useClient(`${__filename}#createCreatorPosts`, (client) => {
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
