import { ChannelType } from "discord.js";

import { useClient } from "../../../services/postgresql";

import type { CreatorType } from "../constants";

// region Types
export type CreatorSubscription = {
  createdAt: Date;
  creatorDomainId: string;
  creatorType: CreatorType;
  lastContentId: string | null;
  creatorChannelId: string;
  creatorChannelType: ChannelType;
  creatorParentId: string | null;
  webhookId: string;
  webhookToken: string;
  creatorMentionRoleId: string | null;
};

type CreateCreatorPost = {
  id: string;
  creatorChannelId: string;
  creatorDomainId: string;
  creatorType: CreatorType;
  contentId: string;
};
// endregion

export const getCreatorSubscriptions = (guildId: string) =>
  useClient(async (client) => {
    const query = `
      select
        cs.created_at as "createdAt",
        c.domain_id as "creatorDomainId",
        c.type as "creatorType",
        cp.content_id as "lastContentId",
        cc.id as "creatorChannelId",
        cc.type as "creatorChannelType",
        cc.parent_id as "creatorParentId",
        cc.webhook_id as "webhookId",
        cc.webhook_token as "webhookToken",
        g.creator_mention_role_id as "creatorMentionRoleId"
      from creator_subscription as cs
      inner join creator as c
        on c.id = cs.creator_id
      inner join creator_channel as cc
        on cc.id = cs.creator_channel_id
      inner join guild as g
        on g.id = cc.guild_id
      left join lateral
        ( select cp.content_id
          from creator_post as cp
          where cp.creator_subscription_id = cs.id
          order by cp.id desc
          limit 1
        ) as cp
        on true
      where g.id = $1
    `;

    const values = [guildId];
    const { rows } = await client.query<CreatorSubscription>(query, values);
    return rows;
  });

export const createCreatorPost = ({
  id,
  creatorChannelId,
  creatorDomainId,
  creatorType,
  contentId,
}: CreateCreatorPost) =>
  useClient((client) => {
    const query = `
      insert into creator_post(id, creator_subscription_id, content_id)
      select
        $1 as id,
        cs.id as creator_subscription_id,
        $5 as content_id
      from creator_subscription as cs
      inner join creator as c
        on c.id = cs.creator_id
      where cs.creator_channel_id = $2
        and c.domain_id = $3
        and c.type = $4
    `;

    return client.query(query, [
      id,
      creatorChannelId,
      creatorDomainId,
      creatorType,
      contentId,
    ]);
  });
