drop index if exists creator_subscription_creator_id_idx;

alter table guild
  drop if exists    max_creator_subscriptions;

alter table creator_channel
  add if not exists creator_mention_role_id bigint null,
  drop if exists    type;

alter table creator_subscription
  add if not exists creator_mention_role_id bigint null;

alter type creator_type add value 'RSS';
