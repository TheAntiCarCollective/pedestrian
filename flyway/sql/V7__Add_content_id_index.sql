-- Delete duplicates
delete from creator_post
where id not in (
  select min(id) as id
  from creator_post
  group by
    creator_subscription_id,
    content_id
);

drop index if exists creator_post_creator_subscription_id_idx;
create unique index on creator_post(creator_subscription_id, content_id);
