alter table guild
  drop if exists max_creator_channels;

alter table creator_channel
  add if not exists type      int not null default 15, -- GUILD_FORUM
  add if not exists parent_id bigint null;
