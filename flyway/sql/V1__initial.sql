CREATE TABLE guilds (
  id                    BIGINT NOT NULL,
  max_creator_channels  INT NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);

CREATE TABLE creator_channels (
  id            BIGINT NOT NULL,
  guild_id      BIGINT NOT NULL,
  webhook_id    BIGINT NOT NULL,
  webhook_token TEXT NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (guild_id)
    REFERENCES guilds(id)
    ON DELETE CASCADE
);

CREATE INDEX ON creator_channels(guild_id);
