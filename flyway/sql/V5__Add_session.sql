create table session(
  id          bigint not null,
  previous_id bigint null,
  context     jsonb not null,
  primary key(id),
  foreign key(previous_id)
    references session(id)
    on delete cascade
);
