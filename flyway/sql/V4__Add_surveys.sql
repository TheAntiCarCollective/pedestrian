alter table guild
  add survey_creator_role_id bigint null;

create extension if not exists citext;

create table survey(
  id          bigint not null,
  guild_id    bigint not null,
  title       citext not null,
  description text not null,
  channel_id  bigint not null,
  created_by  bigint not null,
  primary key(id),
  unique(guild_id, title),
  foreign key(guild_id)
    references guild(id)
    on delete cascade
);

create type survey_question_type as enum('Open Answer', 'Multiple Choice');

create table survey_question(
  id          serial not null,
  type        survey_question_type not null,
  survey_id   bigint not null,
  ask         text not null,
  description text not null,
  min_values  int null,
  max_values  int null,
  primary key(id),
  foreign key(survey_id)
    references survey(id)
    on delete cascade
);

create index on survey_question(survey_id);

create table survey_question_choice(
  id                  serial not null,
  survey_question_id  int not null,
  label               text not null,
  description         text not null,
  primary key(id),
  foreign key(survey_question_id)
    references survey_question(id)
    on delete cascade
);

create index on survey_question_choice(survey_question_id);

create table survey_answer(
  id                  serial not null,
  survey_question_id  int not null,
  created_by          bigint not null,
  answer              jsonb not null,
  primary key(id),
  unique(survey_question_id, created_by),
  foreign key(survey_question_id)
    references survey_question(id)
    on delete cascade
);
