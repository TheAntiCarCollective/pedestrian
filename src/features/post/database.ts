import postgresql from "../../services/postgresql";

import type { CreatorType } from "../creators/constants";

// region Types
export type Subscription = {
  createdAt: Date;
  domainId: string;
  creatorType: CreatorType;
  lastContentId: string | null;
  creatorChannelId: string;
  webhookId: string;
  webhookToken: string;
};

type CreatePost = {
  id: string;
  creatorChannelId: string;
  domainId: string;
  creatorType: CreatorType;
  contentId: string;
};
// endregion

export const getSubscriptions = async (guildId: string) => {
  const query = `
    select
      s.created_at as "createdAt",
      c.domain_id as "domainId",
      c.type as "creatorType",
      p.content_id as "lastContentId",
      cc.id as "creatorChannelId",
      cc.webhook_id as "webhookId",
      cc.webhook_token as "webhookToken"
    from subscription as s
    inner join creator as c
      on c.id = s.creator_id
    inner join creator_channel as cc
      on cc.id = s.creator_channel_id
    left join lateral
      ( select p.content_id
        from post as p
        where p.subscription_id = s.id
        order by p.id desc
        limit 1
      ) as p
      on true
    where cc.guild_id = $1
  `;

  const values = [guildId];
  const { rows } = await postgresql.query<Subscription>(query, values);
  return rows;
};

export const createPost = ({
  id,
  creatorChannelId,
  domainId,
  creatorType,
  contentId,
}: CreatePost) => {
  const query = `
    insert into post(id, subscription_id, content_id)
    select
      $1 as id,
      s.id as subscription_id,
      $5 as content_id
    from subscription as s
    inner join creator as c
      on c.id = s.creator_id
    where s.creator_channel_id = $2
      and c.domain_id = $3
      and c.type = $4
  `;

  return postgresql.query(query, [
    id,
    creatorChannelId,
    domainId,
    creatorType,
    contentId,
  ]);
};
