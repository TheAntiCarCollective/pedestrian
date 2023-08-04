create table guild(
  id                        bigint not null,
  max_creator_channels      int not null default 1,
  max_creator_subscriptions int not null default 10
  primary key(id)
);

create table creator_channel(
  id            bigint not null,
  guild_id      bigint not null,
  webhook_id    bigint not null,
  webhook_token text not null,
  primary key(id),
  foreign key(guild_id)
    references guild(id)
    on delete cascade
);

create index on creator_channel(guild_id);

create type creator_type as enum('YouTube');

create table creator(
  id        serial not null,
  domain_id text not null,
  type      creator_type not null,
  primary key(id),
  unique(domain_id, type)
);

create table creator_subscription(
  id                  serial not null,
  created_at          timestamptz not null default now(),
  creator_channel_id  bigint not null,
  creator_id          int not null,
  primary key(id),
  unique(creator_channel_id, creator_id),
  foreign key(creator_channel_id)
    references creator_channel(id)
    on delete cascade,
  foreign key(creator_id)
    references creator(id)
    on delete cascade
);

create index on creator_subscription(creator_id);

create table creator_post(
  id                      bigint not null,
  creator_subscription_id int not null,
  content_id              text not null,
  primary key(id),
  foreign key(creator_subscription_id)
    references creator_subscription(id)
    on delete cascade
);

create index on creator_post(creator_subscription_id);
